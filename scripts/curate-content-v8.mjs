import {readFile,writeFile} from 'node:fs/promises';
const read=async name=>JSON.parse(await readFile(`research/${name}.json`,'utf8'));
const save=async(name,data)=>writeFile(`research/${name}.json`,JSON.stringify(data,null,2)+'\n');
const addition=await read('content-additions-v8'),lessons=await read('learning'),resources=await read('library'),workflows=await read('workflows'),graph=await read('knowledge-graph');
const upsert=(list,items)=>{for(const item of items){const index=list.findIndex(x=>x.id===item.id);if(index<0)list.push(item);else list[index]=item;}};
upsert(lessons,addition.lessons);upsert(resources,addition.resources);upsert(workflows,[addition.workflow]);
const definitions=[['geometry-reconstruction','公开图像与构型重建','methods'],['mass-properties','组合质量与惯量','structures'],['mesh-validity','网格拓扑与几何检查','methods']];
for(const [id,label,domain] of definitions){upsert(graph.nodes,[{id,label,domain,level:3}]);const lesson=lessons.find(x=>x.id===id);for(const pre of lesson.prerequisites){if(!graph.edges.some(e=>e.from===pre&&e.to===id&&e.type==='prerequisite'))graph.edges.push({from:pre,to:id,type:'prerequisite',reason:`${lessons.find(x=>x.id===pre).title}提供${label}所需的建模约定与检查方法。`});}}
for(const edge of [
 {from:'geometry-reconstruction',to:'mass-properties',type:'coupling',reason:'外形约束不确定尺寸，质量属性还需要独立质量、密度与位置假设。'},
 {from:'geometry-reconstruction',to:'mesh-validity',type:'validation',reason:'构型重建完成后还需检查法向、自交、闭合边界与输出用途。'},
 {from:'mass-properties',to:'uncertainty-quantification',type:'coupling',reason:'设备质量、坐标与几何误差会共同传播到质心和惯量张量。'},
 {from:'mesh-validity',to:'cfd-verification',type:'validation',reason:'拓扑有效不能替代离散精度与力系数的网格收敛验证。'}
])if(!graph.edges.some(e=>e.from===edge.from&&e.to===edge.to&&e.type===edge.type))graph.edges.push(edge);
upsert(graph.paths,[{id:'geometry-to-analysis',title:'构型、质量属性与网格检查',description:'公开资料重建、组合惯量和网格适用性；区分可视化资产与分析输入。',nodeIds:['vectors-matrices','frames-and-time','data-provenance','geometry-reconstruction','six-dof','mass-properties','finite-elements','verification-uncertainty','mesh-validity']}]);
for(const [id,related] of [['data-provenance','geometry-reconstruction'],['six-dof','mass-properties'],['finite-elements','mesh-validity']]){const lesson=lessons.find(l=>l.id===id);if(!lesson.related.includes(related))lesson.related.push(related);}
const briefings=await read('briefings'),newBriefings=await read('briefings-v8');upsert(briefings,newBriefings);briefings.sort((a,b)=>b.date.localeCompare(a.date)||newBriefings.findIndex(n=>n.id===b.id)-newBriefings.findIndex(n=>n.id===a.id));
await Promise.all([save('learning',lessons),save('library',resources),save('workflows',workflows),save('knowledge-graph',graph),save('briefings',briefings)]);
console.log(`Content: ${lessons.length} lessons, ${resources.length} resources, ${workflows.length} workflows, ${graph.edges.length} graph relations, ${briefings.length} briefings.`);
