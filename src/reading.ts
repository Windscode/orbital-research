import {useEffect,useState,useSyncExternalStore} from 'react';
import type {Briefing,Detail,Lesson,Resource,Vehicle} from './types';
export const STUDY_KEY='orbital-study-v1';
export interface StudyEntry {completed:boolean;note:string;updatedAt:string}
export type StudyEntries=Record<string,StudyEntry>;
export const MAX_STUDY_IMPORT_BYTES=8*1024*1024;
export function parseStudyArchive(text:string,knownIds:ReadonlySet<string>){
  if(new TextEncoder().encode(text).length>MAX_STUDY_IMPORT_BYTES)throw new Error('文件超过 8 MiB，请使用本站导出的学习记录。');
  let raw:unknown;try{raw=JSON.parse(text);}catch{throw new Error('无法解析 JSON。请选择本站导出的学习记录文件。');}
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('文件不是学习记录对象。');
  const value=raw as Record<string,unknown>;
  if(value.format!=='orbital-study'||value.version!==1)throw new Error('不支持的文件类型或版本。研究方案 JSON 与学习记录 JSON 用途不同。');
  if(!value.entries||typeof value.entries!=='object'||Array.isArray(value.entries))throw new Error('学习记录缺少 entries 对象。');
  const pairs=Object.entries(value.entries);if(pairs.length>2000)throw new Error('记录数量超过 2000 条，请检查文件来源。');
  const entries:StudyEntries={},unknownIds:string[]=[];
  for(const [id,item] of pairs){
    if(!/^[a-z][a-z0-9-]{0,127}$/.test(id)||!item||typeof item!=='object'||Array.isArray(item)||typeof item.completed!=='boolean'||typeof item.note!=='string'||item.note.length>5000||typeof item.updatedAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(item.updatedAt)||!Number.isFinite(Date.parse(item.updatedAt)))throw new Error(`记录 ${id.slice(0,80)} 的格式、笔记长度或时间戳无效；文件尚未导入。`);
    if(new Date(item.updatedAt).toISOString().slice(0,19)!==item.updatedAt.slice(0,19))throw new Error(`记录 ${id} 的日期不存在；文件尚未导入。`);
    if(!knownIds.has(id)){unknownIds.push(id);continue;}
    if(item.completed||item.note)entries[id]={completed:item.completed,note:item.note,updatedAt:item.updatedAt};
  }
  return {entries,unknownIds,total:pairs.length};
}
/** Restore missing records only. Existing local entries always win, regardless of timestamps. */
export function mergeStudyArchive(current:StudyEntries,incoming:StudyEntries){
  const entries={...current};let added=0,kept=0;
  for(const [id,item] of Object.entries(incoming)){
    if(Object.hasOwn(entries,id)){kept++;continue;}
    entries[id]={...item};added++;
  }
  return {entries,added,kept};
}
export function parseResearchHash(hash:string){
  const [path,query='']=hash.replace(/^#\/?/,'').split('?');
  const page=path.split('/')[0]||'home',read=new URLSearchParams(query).get('read')||'';
  return {page,read};
}
export function researchHash(page:string,detail:Detail|null){
  if(!detail)return `#/${page}`;
  const id=detail.kind==='about'?'about':`${detail.kind}/${detail.item.id}`;
  return `#/${page}?${new URLSearchParams({read:id}).toString()}`;
}
export function findResearchDetail(hash:string,data:{lessons:Lesson[];resources:Resource[];vehicles:Vehicle[];briefings:Briefing[]}):Detail|null{
  const {read}=parseResearchHash(hash);if(read==='about')return {kind:'about'};
  const [kind,id,...extra]=read.split('/');if(extra.length)return null;
  if(kind==='lesson'){const item=data.lessons.find(i=>i.id===id);return item?{kind,item}:null;}
  if(kind==='resource'){const item=data.resources.find(i=>i.id===id);return item?{kind,item}:null;}
  if(kind==='vehicle'){const item=data.vehicles.find(i=>i.id===id);return item?{kind,item}:null;}
  if(kind==='briefing'){const item=data.briefings.find(i=>i.id===id);return item?{kind,item}:null;}
  return null;
}
export function validateStudyEntries(raw:unknown):StudyEntries{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return {};
  return Object.fromEntries(Object.entries(raw).filter(([id,v])=>/^[a-z][a-z0-9-]*$/.test(id)&&v&&typeof v==='object'&&typeof v.completed==='boolean'&&typeof v.note==='string'&&v.note.length<=5000&&typeof v.updatedAt==='string').map(([id,v])=>[id,v as StudyEntry]));
}
type StudyChange=Partial<Pick<StudyEntry,'completed'|'note'>>;
type PendingStudyChanges=Record<string,StudyChange&{updatedAt:string}>;
function applyStudyChanges(entries:StudyEntries,changes:PendingStudyChanges):StudyEntries{
  const next={...entries};
  for(const [id,change] of Object.entries(changes)){
    const previous=next[id]??{completed:false,note:'',updatedAt:''};
    next[id]={...previous,...change};
    if(!next[id].completed&&!next[id].note)delete next[id];
  }
  return next;
}
/** A browser-independent store lets persistence failures be tested without a DOM. */
export function createStudyRecordStore(storage:Pick<Storage,'getItem'|'setItem'>){
  const read=()=>{try{return validateStudyEntries(JSON.parse(storage.getItem(STUDY_KEY)||'{}'));}catch{return undefined;}};
  const initial=read();
  let snapshot={entries:initial??{},persistent:initial!==undefined};
  let pending:PendingStudyChanges={};
  const listeners=new Set<()=>void>();
  const publish=(entries:StudyEntries,persistent:boolean)=>{snapshot={entries,persistent};for(const listener of listeners)listener();};
  const sync=()=>{
    // Read the current value, not a possibly queued storage event's stale value.
    const latest=read();
    if(latest===undefined){publish(snapshot.entries,false);return;}
    publish(applyStudyChanges(latest,pending),Object.keys(pending).length===0);
  };
  const update=(id:string,change:StudyChange)=>{
    const queued={...pending,[id]:{...pending[id],...change,updatedAt:new Date().toISOString()}};
    const latest=read(),next=applyStudyChanges(latest??snapshot.entries,queued);
    let stored=false;
    // Never replace a snapshot that could not be read with a stale cached copy.
    if(latest!==undefined){try{storage.setItem(STUDY_KEY,JSON.stringify(next));stored=true;}catch{/* Retain this session's pending fields. */}}
    pending=stored?{}:queued;
    publish(next,stored);return stored;
  };
  const restore=(incoming:StudyEntries)=>{
    // Re-read at apply time so another tab's new notes are never overwritten.
    const latest=read();if(latest===undefined)return {ok:false,added:0,kept:0};
    const merged=mergeStudyArchive(applyStudyChanges(latest,pending),incoming);
    try{storage.setItem(STUDY_KEY,JSON.stringify(merged.entries));}
    catch{return {ok:false,added:0,kept:merged.kept};}
    pending={};publish(merged.entries,true);return {ok:true,added:merged.added,kept:merged.kept};
  };
  return {getSnapshot:()=>snapshot,subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};},sync,update,restore};
}
export function useStudyRecords(){
  const [store]=useState(()=>createStudyRecordStore({getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)}));
  const {entries,persistent}=useSyncExternalStore(store.subscribe,store.getSnapshot,store.getSnapshot);
  useEffect(()=>{
    const sync=(event:StorageEvent)=>{if(event.key===STUDY_KEY||event.key===null)store.sync();};
    window.addEventListener('storage',sync);store.sync();return()=>window.removeEventListener('storage',sync);
  },[store]);
  function exportRecords(){
    const url=URL.createObjectURL(new Blob([JSON.stringify({format:'orbital-study',version:1,exportedAt:new Date().toISOString(),entries:store.getSnapshot().entries},null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download='orbital-study-records.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return {entries,update:store.update,persistent,exportRecords,restore:store.restore};
}
