import {ArrowUpRight} from 'lucide-react';
const linked={lessonIds:['orbit-propagation','frames-and-time','data-provenance','orbit-determination','numerical-integration'],resourceIds:['jpl-horizons','spice','orekit','tudat','gmat'],vehicleIds:['mro'],dossierIds:[] as string[]};
export default function DataStudyLink({kind,id}:{kind:keyof typeof linked;id:string}){
 if(!linked[kind].includes(id))return null;
 return <section className="data-reading-link"><span>公开数据研究 / MRO</span><p>289 个六维状态、原始响应与独立复算脚本；检查二体传播差值及数值积分误差。</p><a href="#/research?view=data">MRO 火星轨道复算<ArrowUpRight size={16}/></a></section>;
}
