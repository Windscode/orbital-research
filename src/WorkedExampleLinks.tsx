import {ArrowUpRight,Calculator} from 'lucide-react';
import {workedExamples,exampleHref} from './workedExampleIndex';
export default function WorkedExampleLinks({kind,id}:{kind:'lessonIds'|'resourceIds'|'vehicleIds'|'dossierIds';id:string}){
 const matches=workedExamples.filter(e=>(e[kind] as string[]).includes(id));
 if(!matches.length)return null;
 return <section className="worked-links"><span><Calculator size={17}/>计算算例</span><p>输入参数、计算过程与结果表可在网页中核对，附独立复算脚本。</p>{matches.map(e=><a key={e.id} href={exampleHref(e.id)}><b>{e.title}</b><small>{e.subtitle}</small><ArrowUpRight size={16}/></a>)}</section>;
}
