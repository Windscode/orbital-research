import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {loadTypeScript} from './load-typescript.mjs';
const args=process.argv.slice(2),options={};
if(args.includes('--help')){
 console.log('npm run research:packet -- --topic "月面热控" [--type "机构与任务"] [--region "中国"] [--query "热"] [--out test-results/intelligence-maintenance.json]\n从本地来源库生成搜集资料包，不执行联网采集，不覆盖已有文件。');process.exit(0);
}
for(let i=0;i<args.length;i+=2){if(!['--topic','--type','--region','--query','--out'].includes(args[i])||!args[i+1]||args[i+1].startsWith('--'))throw Error('参数无效，运行 --help 查看用法');options[args[i].slice(2)]=args[i+1];}
const {intelligenceSources,sourceMaintenancePacket}=loadTypeScript('src/intelligenceLibrary.ts');
const sources=intelligenceSources.filter(s=>(!options.type||s.type===options.type)&&(!options.region||s.region.includes(options.region))&&(!options.query||[s.name,s.description,...s.topics].join(' ').toLowerCase().includes(options.query.toLowerCase())));
if(!sources.length)throw Error('筛选后没有来源；请调整条件。');
const briefings=JSON.parse(readFileSync('research/briefings.json','utf8')),maintenance=JSON.parse(readFileSync('research/intelligence-maintenance-v9.json','utf8'));
const output=path.resolve(options.out||`test-results/intelligence-maintenance-${Date.now()}.json`);mkdirSync(path.dirname(output),{recursive:true});
writeFileSync(output,JSON.stringify({...sourceMaintenancePacket(sources,briefings,options.topic||'航天仿真'),maintenance},null,2)+'\n',{flag:'wx'});
console.log(`已生成 ${sources.length} 个来源与 ${briefings.length} 条已有情报的搜集资料包：${output}\n请按 stages 与 searchTemplates 联网查阅；资料包不代表完成了新一轮核查。`);
