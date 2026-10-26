import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const read=async name=>JSON.parse(await readFile(new URL(`research/${name}.json`,root),'utf8'));
const [lessons,resources,vehicles,briefings,workflows]=await Promise.all(['learning','library','vehicles','briefings','workflows'].map(read));
const payload={counts:{lessons:lessons.length,resources:resources.length,vehicles:vehicles.length,briefings:briefings.length,workflows:workflows.length},resources:resources.slice(0,5),briefings:briefings.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3)};
await writeFile(new URL('research/home-bootstrap.json',root),JSON.stringify(payload,null,2)+'\n');
console.log('Generated homepage subset: 5 resources and 3 briefings; full catalogs remain deferred.');
