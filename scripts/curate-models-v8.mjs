import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const json=async name=>JSON.parse(await readFile(`research/${name}.json`,'utf8'));
const profiles=(await Promise.all(['rockets','spacecraft','surface'].map(name=>json(`model-research-${name}-v8`)))).flat();
const vehicles=await json('vehicles');assert.equal(profiles.length,vehicles.length);assert.equal(new Set(profiles.map(p=>p.id)).size,vehicles.length);
for(const vehicle of vehicles){
 const review=profiles.find(p=>p.id===vehicle.id);assert(review,vehicle.id);vehicle.model.review=review;
 for(const feature of review.features)assert(vehicle.model.parts.some(p=>p.id===feature.partId),`${vehicle.id}: ${feature.partId}`);
 for(const source of review.sources)if(!vehicle.sources.some(s=>s.url===source.url))vehicle.sources.push(source);
}
const landsat=vehicles.find(v=>v.id==='landsat-1');
const source='https://science.nasa.gov/mission/landsat-1/';
for(const part of landsat.model.parts)if(part.id==='propulsion')Object.assign(part,{name:'姿控气体推进功能区',description:'NASA 任务页面记载以地平仪、太阳传感器和 freon 气体推进系统实现三轴稳定。此处喷口数量、方向和贮罐位置未由安装图验证。',sourceUrl:source,evidence:'工程示意'});
for(const system of landsat.systems)if(/肼|推进/.test(system.name))Object.assign(system,{name:'姿态控制与气体推进',function:'NASA 任务页面将地平仪、太阳传感器与 freon 气体推进系统列为三轴稳定方案；并非已核实的肼发动机布局。喷口安装方向仍按示意处理。',sourceUrl:source,evidence:'公开结构'});
landsat.verifiedOn='2026-10-26';
await writeFile('research/vehicles.json',JSON.stringify(vehicles,null,2)+'\n');
await writeFile('research/model-research-v8.json',JSON.stringify(profiles,null,2)+'\n');
console.log(`Merged ${profiles.length} model configurations with ${profiles.reduce((n,p)=>n+p.features.length,0)} source-linked features.`);
