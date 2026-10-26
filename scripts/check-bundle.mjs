import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
const base=new URL('../dist/',import.meta.url),manifest=JSON.parse(await readFile(new URL('.vite/manifest.json',base),'utf8'));
const entry=Object.keys(manifest).find(k=>manifest[k].isEntry);assert.ok(entry);
const initial=new Set();function visit(k){if(initial.has(k))return;initial.add(k);for(const child of manifest[k].imports||[])visit(child);}visit(entry);
for(const route of ['src/catalogData.ts','src/KnowledgeMap.tsx','src/VehicleAtlas.tsx','src/ResearchHub.tsx','src/ResearchDossiers.tsx','src/OrbitLab.tsx','src/IntelligenceHub.tsx','src/VehicleExplorer.tsx','src/ProjectShowcase.tsx']){
 // Rollup may emit a shared dynamic facade without its original source key.
 const name=route.split('/').at(-1).replace(/\.tsx?$/,''),matches=Object.keys(manifest).filter(k=>k===route||(manifest[k].name===name&&manifest[k].isDynamicEntry));
 assert.equal(matches.length,1,`${route} must resolve to one deferred entry`);const key=matches[0];
 assert.ok(manifest[key]?.isDynamicEntry,`${route} must be a deferred entry`);assert.ok(!initial.has(key),`${route} must not be a static dependency of the initial page`);
 assert.ok(Object.values(manifest).some(chunk=>chunk.dynamicImports?.includes(key)),`${route} must have a dynamic import caller`);
}
let bytes=0,gzipBytes=0;for(const k of initial){const b=await readFile(new URL(manifest[k].file,base));bytes+=b.byteLength;gzipBytes+=gzipSync(b).byteLength;}
assert.ok(bytes<450000,`Initial JS budget exceeded: ${bytes}`);
console.log(JSON.stringify({check:'Initial script dependency closure excludes full catalogs and deferred routes',initialJsBytes:bytes,initialGzipBytes:gzipBytes,budgetBytes:450000,initialModules:[...initial]},null,2));
