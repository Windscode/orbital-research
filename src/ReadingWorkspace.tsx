import {useEffect,useRef,useState} from 'react';
import {flushSync} from 'react-dom';
import {ArrowDownToLine,BookOpen,Check,CheckCheck,ChevronDown,Link,NotebookPen,Type} from 'lucide-react';
import type {StudyEntry} from './reading';

export function StudyProgress({total,completed,notes,onExport}:{total:number;completed:number;notes:number;onExport:()=>void}){
  return <section className="study-overview"><div className="study-overview-heading"><BookOpen size={21} strokeWidth={1.4}/><div><strong>学习记录</strong><p>保存已读状态与个人笔记，可导出备份或从本地文件恢复。</p></div></div><div className="study-overview-progress"><b>{completed}<small> / {total}</small></b><span>篇已读 · {notes} 条个人笔记</span><div className="study-meter"><i style={{width:`${total?completed/total*100:0}%`}}/></div></div><button className="text-link" onClick={onExport}><ArrowDownToLine size={15}/>导出学习记录</button></section>;
}
export default function ReadingWorkspace({children,id,record,onUpdate,onCopyLink}:{children:React.ReactNode;id:string;record?:StudyEntry;onUpdate:(value:Partial<Pick<StudyEntry,'completed'|'note'>>)=>boolean;onCopyLink:()=>void}){
  const content=useRef<HTMLDivElement>(null),[sections,setSections]=useState<{label:string;node:HTMLElement}[]>([]),[active,setActive]=useState(0),[progress,setProgress]=useState(0),[menu,setMenu]=useState(false),[large,setLarge]=useState(false),[draft,setDraft]=useState(record?.note||''),[feedback,setFeedback]=useState('');
  const lastSavedNote=useRef(record?.note||'');
  useEffect(()=>{
    const next=record?.note||'',previous=lastSavedNote.current;
    if(draft===previous)setDraft(next);
    else if(next!==draft)setFeedback('另一标签页更新了已保存笔记；当前未保存草稿已保留，保存将以此草稿替换笔记。');
    lastSavedNote.current=next;
  },[record?.note]);
  useEffect(()=>{
    const article=content.current,dialog=article?.closest('dialog');if(!article||!dialog)return;
    const elements=[...article.querySelectorAll<HTMLElement>('h1,h2,.reader-objectives>.eyebrow,.research-callout>span,.sources>h4,.reader-related>span')];
    const items=elements.map((node,i)=>{node.dataset.readingSection=String(i);return {node,label:i===0?'摘要与导读':(node.textContent||'').replace('PRIMARY SOURCES','').trim()};});setSections(items);
    const update=()=>{const top=dialog.getBoundingClientRect().top+85;let current=0;for(let i=0;i<items.length;i++)if(items[i].node.getBoundingClientRect().top<=top)current=i;setActive(current);const range=dialog.scrollHeight-dialog.clientHeight;setProgress(range>0?Math.min(100,Math.round(dialog.scrollTop/range*100)):100);};
    update();dialog.addEventListener('scroll',update,{passive:true});const resize=new ResizeObserver(update);resize.observe(article);return()=>{dialog.removeEventListener('scroll',update);resize.disconnect();};
  },[id]);
  function jump(index:number){
    flushSync(()=>setMenu(false));
    const behavior=matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth';
    if(index===0)content.current?.closest('dialog')?.scrollTo({top:0,behavior});
    else sections[index]?.node.scrollIntoView({behavior,block:'start'});
  }
  function save(){const persisted=onUpdate({note:draft});setFeedback(persisted?'笔记已保存在当前浏览器':'浏览器存储不可用，笔记仅保留在本次会话');}
  const dirty=draft!==(record?.note||'');
  return <div className={`reading-workspace ${large?'reading-large':''}`}><aside className="reading-guide"><div className="reading-guide-label"><span>ON THIS PAGE</span><BookOpen size={15}/></div><div className="reading-progress"><span>阅读位置</span><b>{progress}%</b><div><i style={{width:`${progress}%`}}/></div></div><button className="reading-mobile-toggle" onClick={()=>setMenu(!menu)} aria-expanded={menu}>章节导航 · {sections.length}<ChevronDown size={14}/></button><nav aria-label="文章章节" className={menu?'is-open':''}>{sections.map((s,i)=><button key={i} className={active===i?'active':''} aria-current={active===i?'location':undefined} onClick={()=>jump(i)}><span>{String(i+1).padStart(2,'0')}</span>{s.label}</button>)}</nav><div className="reading-guide-actions"><button onClick={()=>{const ok=onUpdate({completed:!record?.completed});if(!ok)setFeedback('浏览器存储不可用，已读状态仅保留在本次会话');}} className={record?.completed?'is-complete':''} aria-pressed={!!record?.completed}>{record?.completed?<CheckCheck size={15}/>:<Check size={15}/>} {record?.completed?'已读 · 点击撤销':'标记为已读'}</button><button onClick={onCopyLink}><Link size={14}/>复制条目链接</button><button aria-pressed={large} onClick={()=>setLarge(!large)}><Type size={15}/>{large?'恢复标准字号':'增大正文字号'}</button></div><p className="reading-local-note">已读与笔记保存在当前浏览器。</p></aside><div ref={content} className="reader-content">{children}<section className="personal-study-note"><span className="eyebrow"><NotebookPen size={15}/> MY RESEARCH NOTES</span><h2>个人研究笔记</h2><p>记录假设、复现实验或待核查的来源。内容仅保存在本地浏览器，不会上传。</p><label htmlFor={`note-${id}`}>我的研究笔记</label><textarea id={`note-${id}`} value={draft} maxLength={5000} rows={5} onChange={e=>{setDraft(e.target.value);setFeedback('');}} placeholder="例如：这个模型在哪些条件下会失效？下一次实验需要什么输入与对照数据？"/><div className="study-note-footer"><span>{draft.length} / 5000{dirty?' · 有未保存修改':''}</span><button className="button secondary" onClick={save} disabled={!dirty}><Check size={14}/>保存笔记</button></div>{feedback&&<p className="study-note-feedback" role="status">{feedback}</p>}</section></div></div>;
}
