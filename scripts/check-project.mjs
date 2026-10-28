import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const report=JSON.parse(await readFile(new URL('../research/project-deep-dive.json',import.meta.url),'utf8'));
const statuses=new Set(['implemented','test-code','recorded','planned','not-found']);
assert.equal(report.schemaVersion,1);
const ids=new Set(report.evidence.map(e=>e.id));
assert.equal(ids.size,report.evidence.length,'Evidence IDs must be unique');
for(const e of report.evidence){
 assert.ok(statuses.has(e.status),`${e.id}: unlabelled evidence status`);
 assert.ok(e.title&&e.detail,`${e.id}: missing public implementation description`);
 for(const s of e.sources||[])assert.ok(!('path' in s)&&!('line' in s)&&!('endLine' in s),`${e.id}: private source locations must not ship`);
}
let references=0;
function walk(value){if(!value||typeof value!=='object')return;if('evidenceIds' in value){for(const id of value.evidenceIds){assert.ok(ids.has(id),`Missing cited evidence ${id}`);references++;}}for(const v of Object.values(value))walk(v);}
walk(report);
for(const section of ['architecture','pipeline','deepTopics','scenarios','validation','limitations','nextExperiments']){assert.ok(report[section].length);assert.equal(new Set(report[section].map(x=>x.id)).size,report[section].length);}
for(const [i,step] of report.pipeline.entries())assert.equal(step.order,i+1,'Pipeline order must match navigation');
for(const v of report.validation){
 assert.ok(['recorded','test-code'].includes(v.status),'Do not relabel historical records as newly run verification');
 assert.ok(v.method&&v.result&&v.scope&&v.sourceIdentity);
 if(v.chart){const c=v.chart;assert.equal(v.status,'recorded');assert.ok(c.xLabel&&c.yLabel);assert.ok(c.reference===undefined||Number.isFinite(c.reference));for(const s of c.series){assert.ok(s.points.length>=2);assert.ok(s.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));assert.ok(Math.max(...s.points.map(p=>p.x))>Math.min(...s.points.map(p=>p.x)));}}
}
assert.match(report.overview.scope,/没有运行|未运行/,'State that this audit is read-only, not a new UE test run');
console.log(`PASS: project review — ${report.deepTopics.length} topics, ${ids.size} evidence entries, ${references} valid citations, ${report.validation.length} scoped validation records.`);
