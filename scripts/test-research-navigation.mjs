import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import path from 'node:path';
import ts from 'typescript';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url);
async function moduleFrom(file){const source=await readFile(path.join(root,file),'utf8');let js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;js=js.replace(/from ['"]react['"]/g,`from ${JSON.stringify(pathToFileURL(require.resolve('react')).href)}`);return import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);}
const {parseResearchHash,researchHash,findResearchDetail,validateStudyEntries,createStudyRecordStore,STUDY_KEY}=await moduleFrom('src/reading.ts');
const {rankResearchSearch}=await moduleFrom('src/researchSearch.ts');
const read=async name=>JSON.parse(await readFile(path.join(root,'research',name+'.json'),'utf8'));
const data={lessons:await read('learning'),resources:await read('library'),vehicles:await read('vehicles'),briefings:await read('briefings')};
let count=0;
for(const [kind,items] of [['lesson',data.lessons],['resource',data.resources],['vehicle',data.vehicles],['briefing',data.briefings]])for(const item of items){const detail={kind,item};const hash=researchHash('knowledge',detail);assert.equal(parseResearchHash(hash).page,'knowledge');assert.deepEqual(findResearchDetail(hash,data),detail);count++;}
assert.equal(parseResearchHash('').page,'home');assert.equal(findResearchDetail('#/knowledge?read=lesson%2Fmissing',data),null);assert.equal(findResearchDetail('#/knowledge?read=%E0%A4%A',data),null);assert.deepEqual(findResearchDetail(researchHash('home',{kind:'about'}),data),{kind:'about'});assert.equal(researchHash('vehicles',null),'#/vehicles');
for(const context of ['#/research?topic=thermal-power-coupling','#/intelligence?view=sources','#/resources?plan=ground-replay','#/lab?experiment=numerical']){
 const {page}=parseResearchHash(context),opened=researchHash(page,{kind:'lesson',item:data.lessons[0]},context);
 assert.ok(opened.startsWith(context+'&read='));assert.equal(researchHash(page,null,opened),context);
}
assert.equal(researchHash('vehicles',null,'#/research?topic=thermal-power-coupling'),'#/vehicles');
const good={completed:true,note:'坐标系与时间尺度需要独立核查。',updatedAt:'2026-10-25T00:00:00.000Z'};
assert.deepEqual(validateStudyEntries({'frames-and-time':good,broken:{...good,note:[]},oversized:{...good,note:'x'.repeat(5001)}}),{'frames-and-time':good});assert.deepEqual(validateStudyEntries(null),{});assert.deepEqual(validateStudyEntries([]),{});assert.deepEqual(validateStudyEntries(JSON.parse('{"__proto__":{"completed":true,"note":"x","updatedAt":"x"}}')),{});
const items=[{id:'body',title:'任务设计',summary:'通用任务',searchText:'NAIF SPICE 教程',label:'知识库'},{id:'title',title:'NAIF SPICE',summary:'坐标与时间',searchText:'轨道',label:'工具与数据'},{id:'image',title:'Apollo LM',summary:'月面影像',searchText:'NASA',label:'影像图鉴'}];
assert.deepEqual(rankResearchSearch(items,'ＳＰＩＣＥ').map(x=>x.id),['title','body']);assert.deepEqual(rankResearchSearch(items,'apollo NASA').map(x=>x.id),['image']);assert.deepEqual(rankResearchSearch(items,'Apollo missing'),[]);assert.deepEqual(rankResearchSearch(items,'  '),items);
assert.equal(rankResearchSearch([...items,{id:'long',title:'Artemis II 月球科学归档发布：影像已开放，SPICE 内核仍待确认',summary:'SPICE 数据归档',searchText:'',label:'研究情报'}],'SPICE')[0].id,'title');
assert.equal(findResearchDetail('#/knowledge?read=lesson%2Forbit-propagation%2Fextra',data),null);

// Two stores share one persisted snapshot, as independent browser tabs do.
function storageFixture(seed={}){
  const values=new Map([[STUDY_KEY,JSON.stringify(seed)]]);
  return {values,client(){
    const failure={read:false,write:false};let writes=0;
    return {failure,get writes(){return writes;},adapter:{
      getItem(key){if(failure.read)throw new Error('Storage read blocked');return values.get(key)??null;},
      setItem(key,value){writes++;if(failure.write)throw new Error('Storage quota exceeded');values.set(key,value);},
    }};
  },persisted(){return JSON.parse(values.get(STUDY_KEY)||'{}');}};
}
let persistenceCases=0;
{
  const shared=storageFixture(),a=createStudyRecordStore(shared.client().adapter),b=createStudyRecordStore(shared.client().adapter);
  assert.equal(a.update('frames-and-time',{note:'A 的已保存笔记'}),true);
  // Deliberately do not deliver a storage event before B saves another article.
  assert.equal(b.update('orbit-propagation',{note:'B 的已保存笔记'}),true);
  assert.equal(shared.persisted()['frames-and-time'].note,'A 的已保存笔记');
  assert.equal(shared.persisted()['orbit-propagation'].note,'B 的已保存笔记');
  a.sync();assert.deepEqual(a.getSnapshot().entries,b.getSnapshot().entries);
  persistenceCases++;
}
{
  const shared=storageFixture(),a=createStudyRecordStore(shared.client().adapter),b=createStudyRecordStore(shared.client().adapter);
  a.update('frames-and-time',{note:'已保存的推导'});b.update('frames-and-time',{completed:true});
  assert.equal(shared.persisted()['frames-and-time'].note,'已保存的推导');assert.equal(shared.persisted()['frames-and-time'].completed,true);
  a.sync();assert.equal(a.getSnapshot().entries['frames-and-time'].completed,true);
  // Explicit deletion in another tab must not be resurrected by a stale cache.
  b.update('frames-and-time',{completed:false,note:''});a.sync();assert.deepEqual(a.getSnapshot().entries,{});
  persistenceCases++;
}
{
  const shared=storageFixture(),localClient=shared.client(),local=createStudyRecordStore(localClient.adapter),remote=createStudyRecordStore(shared.client().adapter);
  localClient.failure.write=true;
  assert.equal(local.update('frames-and-time',{note:'仅在本会话保存的推导'}),false);
  assert.equal(local.getSnapshot().persistent,false);
  remote.update('orbit-propagation',{note:'另一标签的笔记'});remote.update('frames-and-time',{completed:true});
  local.sync();
  assert.equal(local.getSnapshot().entries['frames-and-time'].note,'仅在本会话保存的推导');
  assert.equal(local.getSnapshot().entries['frames-and-time'].completed,true);
  assert.equal(local.getSnapshot().entries['orbit-propagation'].note,'另一标签的笔记');
  assert.equal(local.getSnapshot().persistent,false);
  localClient.failure.write=false;
  assert.equal(local.update('numerical-integration',{completed:true}),true);
  assert.equal(local.getSnapshot().persistent,true);
  assert.deepEqual(shared.persisted(),local.getSnapshot().entries);
  assert.equal(shared.persisted()['frames-and-time'].note,'仅在本会话保存的推导');
  persistenceCases++;
}
{
  const shared=storageFixture({'frames-and-time':good}),client=shared.client(),local=createStudyRecordStore(client.adapter),remote=createStudyRecordStore(shared.client().adapter);
  client.failure.write=true;
  local.update('frames-and-time',{completed:false,note:''});
  remote.update('orbit-propagation',{note:'远端仍可持久化'});local.sync();
  assert.equal(local.getSnapshot().entries['frames-and-time'],undefined,'A pending deletion must survive storage synchronization');
  assert.equal(local.getSnapshot().entries['orbit-propagation'].note,'远端仍可持久化');
  client.failure.write=false;local.update('numerical-integration',{completed:true});
  assert.equal(shared.persisted()['frames-and-time'],undefined);
  assert.equal(shared.persisted()['orbit-propagation'].note,'远端仍可持久化');
  persistenceCases++;
}
{
  const shared=storageFixture({'frames-and-time':good}),client=shared.client(),local=createStudyRecordStore(client.adapter),remote=createStudyRecordStore(shared.client().adapter);
  client.failure.read=true;const writesBefore=client.writes;
  assert.equal(local.update('numerical-integration',{note:'无法读取存储时的会话记录'}),false);
  assert.equal(client.writes,writesBefore,'An unreadable shared snapshot must not be overwritten');
  remote.update('orbit-propagation',{note:'远端更新'});local.sync();
  assert.equal(local.getSnapshot().entries['frames-and-time'].note,good.note);
  assert.equal(local.getSnapshot().entries['numerical-integration'].note,'无法读取存储时的会话记录');
  client.failure.read=false;local.sync();
  assert.equal(local.getSnapshot().entries['orbit-propagation'].note,'远端更新');
  assert.equal(local.getSnapshot().entries['numerical-integration'].note,'无法读取存储时的会话记录');
  local.update('six-dof',{completed:true});assert.deepEqual(shared.persisted(),local.getSnapshot().entries);
  persistenceCases++;
}
{
  const shared=storageFixture({'frames-and-time':good}),client=shared.client(),local=createStudyRecordStore(client.adapter);let notifications=0;
  const stop=local.subscribe(()=>notifications++);
  shared.values.clear();local.sync();assert.deepEqual(local.getSnapshot().entries,{});assert.equal(notifications,1);
  stop();local.update('frames-and-time',{completed:true});assert.equal(notifications,1);
  persistenceCases++;
}
console.log(`PASS: ${count} article deep-link roundtrips, unknown/malformed routes, local note recovery, title ranking, Unicode normalization and multiple-keyword matching; ${persistenceCases} multi-tab/storage-failure regression scenarios.`);
