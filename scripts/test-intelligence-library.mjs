import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadTypeScript} from './load-typescript.mjs';
const {intelligenceSources:sources,matchIntelligenceSource:match,parseSourceWatchlist,sourceMaintenancePacket,sourceBriefings}=loadTypeScript('src/intelligenceLibrary.ts');
const maintenance=JSON.parse(readFileSync('research/intelligence-maintenance-v9.json','utf8')),briefings=JSON.parse(readFileSync('research/briefings.json','utf8'));
const ids=new Set(),urls=new Set(),verification={};
for(const s of sources){
 assert.match(s.id,/^[a-z][a-z0-9-]+$/);assert.ok(!ids.has(s.id));ids.add(s.id);
 const u=new URL(s.url);assert.equal(u.protocol,'https:');assert.equal(u.username+u.password,'');assert.ok(!urls.has(u.href));urls.add(u.href);
 for(const key of ['name','description','cadence','accessNote'])assert.ok(typeof s[key]==='string'&&s[key].trim().length>0,`${s.id}.${key}`);
 for(const key of ['region','language','topics','whatToLookFor','queryExamples','checks'])assert.ok(Array.isArray(s[key])&&s[key].length>0&&s[key].every(x=>typeof x==='string'&&x.trim()),`${s.id}.${key}`);
 assert.ok(['official','research','release','reporting','index'].includes(s.evidenceRole));assert.ok(['active','archive','review'].includes(s.status));
 assert.ok(['page-read','search-result','access-limited'].includes(s.verification.method));assert.ok(s.verification.note.length>10);verification[s.verification.method]=(verification[s.verification.method]||0)+1;
 assert.match(s.reviewedOn,/^\d{4}-\d{2}-\d{2}$/);assert.ok(s.reviewedOn<='2026-10-26');
 for(const key of ['feedUrl','searchUrl'])if(s[key])assert.equal(new URL(s[key]).protocol,'https:');
}
assert.equal(new Set(sources.map(s=>s.type)).size,5);assert.ok(sources.length>=47);
assert.equal(match('https://www.nasa.gov/missions/artemis/example/')?.id,'nasa-news');
assert.equal(match('https://www.nasa.gov/nesc/knowledge-products/nesc-technical-bulletins/')?.id,'nasa-nesc');
assert.equal(match('https://www.nasa.gov/smallsat-institute/sst-soa/thermal-control/')?.id,'nasa-smallsat-soa');
assert.equal(match('https://www.nasa.gov/nesc-example/')?.id,'nasa-news');
assert.equal(match('https://science.nasa.gov/missions/swift/example/')?.id,'nasa-science');
assert.equal(match('https://www.jpl.nasa.gov/news/example/')?.id,'jpl-news');
assert.equal(match('https://nasa.gov.example.org/news/'),undefined);assert.equal(match('not a URL'),undefined);
const nested=[{...sources[0],id:'general',url:'https://sample.org/'},{...sources[0],id:'news',url:'https://sample.org/news/'}];
assert.equal(match('https://sample.org/news/item',nested)?.id,'news');assert.equal(match('https://sample.org/newsroom',nested)?.id,'general');
assert.deepEqual(parseSourceWatchlist('{'),[]);assert.deepEqual(parseSourceWatchlist('{}'),[]);assert.deepEqual(parseSourceWatchlist('["nasa-news","nasa-news","missing",2]'),['nasa-news']);
for(const b of briefings)for(const id of b.sourceIds||[])assert.ok(ids.has(id),`${b.id}: unknown source ID ${id}`);
for(const s of sources)for(const b of sourceBriefings(s.id,briefings))assert.ok(b.sourceIds?.includes(s.id)||[b.source,...(b.additionalSources||[])].some(x=>match(x.url)?.id===s.id));
assert.equal(sources.find(s=>s.id==='orbital-index').status,'archive');assert.equal(sources.find(s=>s.id==='ecss').status,'review');
const packet=sourceMaintenancePacket(sources.slice(0,2),briefings,'J2');assert.equal(packet.sources.length,2);assert.equal(packet.existingBriefings.length,briefings.length);assert.equal(packet.topic,'J2');assert.match(packet.mode,/no feeds fetched/);assert.ok(packet.instructions.length>=4);
assert.ok(maintenance.stages.length>=7&&maintenance.searchTemplates.length>=8&&maintenance.inclusionCriteria.length>0&&maintenance.history.length>0);
for(const b of briefings){if(b.relatedResources){const resources=JSON.parse(readFileSync('research/library.json','utf8'));for(const id of b.relatedResources)assert.ok(resources.some(r=>r.id===id),`${b.id}: missing resource ${id}`);}}
console.log(JSON.stringify({check:'Source contracts, URL association, watchlist recovery, export provenance, maintenance and briefing resource references',sources:sources.length,verification,stages:maintenance.stages.length,templates:maintenance.searchTemplates.length},null,2));
