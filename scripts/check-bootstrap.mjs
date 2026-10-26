import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=async name=>JSON.parse(await readFile(new URL(`../research/${name}.json`,import.meta.url),'utf8'));
const [boot,lessons,resources,vehicles,briefings,workflows]=await Promise.all(['home-bootstrap','learning','library','vehicles','briefings','workflows'].map(read));
assert.deepEqual(boot.counts,{lessons:lessons.length,resources:resources.length,vehicles:vehicles.length,briefings:briefings.length,workflows:workflows.length});
assert.deepEqual(boot.resources,resources.slice(0,5));assert.deepEqual(boot.briefings,briefings.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3));
console.log('PASS: Homepage metadata and complete subset records match the full catalog.');
