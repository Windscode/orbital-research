import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadTypeScript} from './load-typescript.mjs';
const read=n=>JSON.parse(readFileSync(`research/${n}.json`,'utf8'));
const {dossiers}=read('research-dossiers-v10'),catalog={lessonIds:read('learning'),resourceIds:read('library'),vehicleIds:read('vehicles'),workflowIds:read('workflows'),briefingIds:read('briefings')};
assert.equal(new Set(dossiers.map(d=>d.id)).size,dossiers.length);
let references=0;
for(const d of dossiers){
 for(const key of ['id','code','title','summary','question','reviewedOn'])assert.ok(typeof d[key]==='string'&&d[key].trim(),`${d.id}.${key}`);
 for(const [key,items] of Object.entries(catalog)){assert.ok(Array.isArray(d[key]));assert.equal(new Set(d[key]).size,d[key].length);for(const id of d[key]){assert.ok(items.some(i=>i.id===id),`${d.id}: unresolved ${key} ${id}`);references++;}}
 assert.ok(d.modelScope.length>=3&&d.investigation.length>=4&&d.dataChecklist.length>=6&&d.commonErrors.length>=5);
 for(const m of d.modelScope)for(const key of ['level','model','inputs','outputs','limits'])assert.ok(m[key]?.trim());
 for(const s of d.investigation)for(const key of ['title','detail','deliverable','check'])assert.ok(s[key]?.trim());
 assert.ok(d.sources.length>=3);for(const s of d.sources){assert.ok(s.title);assert.equal(new URL(s.url).protocol,'https:');}
}
const {layoutKnowledgeGraph}=loadTypeScript('src/graphLayout.ts'),graph=read('knowledge-graph');
function verifyLayout(g){for(const domain of ['all',...g.domains.map(d=>d.id)]){
 const layout=layoutKnowledgeGraph(g,domain);
 assert.equal(layout.nodes.length,g.nodes.filter(n=>domain==='all'||n.domain===domain).length);
 for(const n of layout.nodes){const box=layout.groups.find(b=>b.id===n.domain);assert.ok(n.x-n.width/2>=box.x&&n.x+n.width/2<=box.x+box.width,`${n.id}: horizontal clip`);assert.ok(n.y-n.height/2>box.y+40&&n.y+n.height/2<box.y+box.height,`${n.id}: vertical clip`);assert.ok(n.y+n.height/2<layout.height);}
 for(let i=0;i<layout.nodes.length;i++)for(const other of layout.nodes.slice(i+1)){const n=layout.nodes[i];assert.ok(Math.abs(n.x-other.x)>=(n.width+other.width)/2||Math.abs(n.y-other.y)>=(n.height+other.height)/2,`${n.id} overlaps ${other.id}`);}
}}
verifyLayout(graph);
// Future content must increase the row height instead of spilling into another domain.
verifyLayout({...graph,nodes:[...graph.nodes,...Array.from({length:19},(_,i)=>({...graph.nodes[0],id:`stress-${i}`}))]});
const project=read('project-reassessment-v10'),report=read('project-deep-dive'),evidence=new Set(report.evidence.map(e=>e.id));
assert.equal(project.scope.testsExecuted,false);assert.equal(project.scope.sourceProjectModified,false);
for(const c of project.caseStudies){for(const id of [...c.existingEvidenceIds,...c.newEvidenceIds])assert.ok(evidence.has(id));assert.ok(c.proves.length&&c.doesNotProve.length&&c.steps.length&&c.inputs.length&&c.outputs.length);}
for(const row of project.verificationMatrix){assert.equal(row.newRunThisReview,false);for(const id of row.evidenceIds)assert.ok(evidence.has(id));}
assert.match(report.validation.find(v=>v.id==='validation-installation').sourceIdentity,/90fa6ebd/);
assert.match(report.validation.find(v=>v.id==='validation-contact').sourceIdentity,/5534d58b/);
console.log(`PASS: ${dossiers.length} dossiers, ${references} cross-catalog references, dynamic graph containment and future growth, ${project.caseStudies.length} project cases and historical identity preservation.`);
