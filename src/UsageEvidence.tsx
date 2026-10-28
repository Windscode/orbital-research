import {ArrowUpRight} from 'lucide-react';
import type {Resource} from './types';
const caseTypes=['官方案例','官方任务资料','机构公开应用记录'];
export default function UsageEvidence({items}:{items:NonNullable<Resource['usageEvidence']>}){
 const groups=[{title:'任务与机构应用记录',items:items.filter(e=>caseTypes.includes(e.evidenceType))},{title:'能力文档、示例与方法论文',items:items.filter(e=>!caseTypes.includes(e.evidenceType))}];
 return <><h2>使用记录与方法文档</h2>{groups.filter(g=>g.items.length).map(g=><section key={g.title}><h3 className="evidence-subheading">{g.title}</h3><div className="usage-evidence">{g.items.map((e,i)=><article key={i}><span className={caseTypes.includes(e.evidenceType)?'evidence-case':'evidence-document'}>{e.evidenceType}</span><h3>{e.organization}</h3><p>{e.context}</p><a href={e.sourceUrl} target="_blank" rel="noreferrer">查阅原始资料<ArrowUpRight size={13}/></a></article>)}</div></section>)}</>;
}
