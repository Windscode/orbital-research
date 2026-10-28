import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const json=async name=>JSON.parse(await readFile(new URL(`../research/${name}.json`,import.meta.url),'utf8'));
async function load(name){let js=ts.transpileModule(await readFile(new URL(`../src/${name}.ts`,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;js=js.replace(/from ['"]react['"]/g,`from ${JSON.stringify(pathToFileURL(require.resolve('react')).href)}`);return import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);}
const {parseStudyArchive,mergeStudyArchive,createStudyRecordStore,STUDY_KEY}=await load('reading');
const {resourceAccess}=await load('resourceAccess');
const [workflows,lessons,resources,vehicles,briefings]=await Promise.all(['workflows','learning','library','vehicles','briefings'].map(json));
const core=[...lessons,...resources,...vehicles,...briefings];
const known=new Set(core.map(x=>x.id)),ids=new Set(known);let references=0;
for(const w of workflows){
 assert(!ids.has(w.id));ids.add(w.id);
 for(const field of ['title','shortTitle','question','summary','domain','level','deliverable','boundary'])assert(w[field]?.trim(),`${w.id}.${field}`);
 assert.equal(w.contract.length,3);assert.equal(w.steps.length,4);assert(w.validation.length>=3);assert(w.pitfalls.length>=3);assert(w.sources.length>=3);
 for(const [key,list] of [['lessonIds',lessons],['resourceIds',resources],['vehicleIds',vehicles]]){
  assert.equal(new Set(w[key]).size,w[key].length);for(const id of w[key]){assert(list.some(x=>x.id===id),`${w.id} missing ${id}`);references++;}
 }
 for(const c of w.contract)for(const k of ['field','value','why'])assert(c[k]?.length>1);
 assert.equal(new Set(w.steps.map(s=>s.id)).size,w.steps.length);
 for(const s of w.steps){for(const k of ['id','title','detail','output','check'])assert(s[k]?.trim());assert(s.detail.length>70);const key=`workflow-${w.id}-${s.id}`;assert(!known.has(key));known.add(key);}
 for(const s of w.sources)assert.equal(new URL(s.url).protocol,'https:');
}
const record={completed:true,note:'测试记录：保持坐标约定。',updatedAt:'2026-10-26T00:00:00.000Z'};
const pack=entries=>JSON.stringify({format:'orbital-study',version:1,exportedAt:record.updatedAt,entries});
const parsed=parseStudyArchive(pack({'frames-and-time':record,'future-unknown':record,'workflow-ground-replay-capture':record}),known);
assert.deepEqual(parsed.unknownIds,['future-unknown']);assert.equal(Object.keys(parsed.entries).length,2);
assert.deepEqual(parseStudyArchive(pack({}),known).entries,{});
for(const invalid of ['no JSON','[]','null','{}',JSON.stringify({format:'orbital-study',version:2,entries:{}}),JSON.stringify({format:'orbital-research-plan',version:1,entries:{}}),' '.repeat(8*1024*1024+1),pack({'frames-and-time':{...record,note:'x'.repeat(5001)}}),pack({'frames-and-time':{...record,updatedAt:'yesterday'}}),pack({'frames-and-time':{...record,updatedAt:'2026-02-30T00:00:00Z'}}),pack({'frames-and-time':{...record,completed:'yes'}}),pack({'frames-and-time':{...record,updatedAt:'2026-10-26T25:00:00Z'}})])assert.throws(()=>parseStudyArchive(invalid,known));
assert.throws(()=>parseStudyArchive('{"format":"orbital-study","version":1,"entries":{"__proto__":{"note":"x","completed":true,"updatedAt":"2026-10-26T00:00:00Z"}}}',known));
assert.throws(()=>parseStudyArchive(pack(Object.fromEntries(Array.from({length:2001},(_,i)=>[`item-${i}`,record]))),known));
const local={'frames-and-time':{...record,note:'本地最新笔记'}};
const incoming={'frames-and-time':{...record,note:'旧备份'},'orbit-propagation':record};
const merged=mergeStudyArchive(local,incoming);assert.equal(merged.added,1);assert.equal(merged.kept,1);assert.equal(merged.entries['frames-and-time'].note,'本地最新笔记');assert.equal(Object.keys(local).length,1);
let saved=JSON.stringify(local),failRead=false,failWrite=false,writes=0;
const storage={getItem:key=>{assert.equal(key,STUDY_KEY);if(failRead)throw Error('read');return saved;},setItem:(key,value)=>{assert.equal(key,STUDY_KEY);writes++;if(failWrite)throw Error('write');saved=value;}};
const store=createStudyRecordStore(storage);
// Another tab saves after the preview but before restore.
saved=JSON.stringify({...local,'orbit-propagation':{...record,note:'另一标签的新笔记'}});
assert.deepEqual(store.restore(incoming),{ok:true,added:0,kept:2});assert.equal(JSON.parse(saved)['orbit-propagation'].note,'另一标签的新笔记');
failWrite=true;const before=store.getSnapshot();assert.equal(store.restore({'six-dof':record}).ok,false);assert.equal(store.getSnapshot(),before);assert(!JSON.parse(saved)['six-dof']);
failRead=true;const beforeWrites=writes;assert.equal(store.restore({'six-dof':record}).ok,false);assert.equal(writes,beforeWrites);
failRead=false;store.update('attitude-control',{note:'尚未持久化的编辑'});failWrite=false;
assert.equal(store.restore({'six-dof':record}).ok,true);assert.equal(JSON.parse(saved)['attitude-control'].note,'尚未持久化的编辑');assert.equal(store.getSnapshot().persistent,true);
assert.equal(store.restore({'six-dof':record}).added,0);
assert.equal(resourceAccess(resources.find(x=>x.id==='openc3-cosmos')),'source');
assert.equal(resourceAccess(resources.find(x=>x.id==='yamcs')),'open');
assert.equal(resourceAccess(resources.find(x=>x.id==='ccsds-standards')),'standard');
assert.equal(resourceAccess(resources.find(x=>x.id==='satnogs')),'data');
assert.equal(resourceAccess(resources.find(x=>x.id==='ansys-fluent')),'commercial');
for(const id of ['fun3d','espss','esa-godot'])assert.equal(resourceAccess(resources.find(x=>x.id===id)),'restricted',`${id}: restricted eligibility must appear in the directory filter`);
console.log(`PASS: ${workflows.length} research workflows, ${workflows.reduce((sum,w)=>sum+w.steps.length,0)} step records, ${references} cross-library references; strict archive validation, non-destructive restore, concurrent edits, storage failures, and source-available license classification.`);
