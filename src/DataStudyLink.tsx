import {ArrowUpRight} from 'lucide-react';
const linked={lessonIds:['orbit-propagation','frames-and-time','data-provenance','orbit-determination','numerical-integration'],resourceIds:['jpl-horizons','spice','orekit','tudat','gmat'],vehicleIds:['mro'],dossierIds:[] as string[]};
const aero={lessonIds:['aero-database','cfd-verification'],resourceIds:['nasa-tmr','su2','fun3d','openfoam','ansys-fluent'],vehicleIds:[] as string[],dossierIds:[] as string[]};
export default function DataStudyLink({kind,id}:{kind:keyof typeof linked;id:string}){
 if(aero[kind].includes(id))return <section className="data-reading-link"><span>公开数据研究 / NACA 0012</span><p>从 513 个原始压力点开始，逐面元计算气动力，比较压力阻力与总阻力，并下载独立复算脚本。</p><a href="#/research?view=data&case=naca0012">NACA 0012 压力积分<ArrowUpRight size={16}/></a></section>;
 if(!linked[kind].includes(id))return null;
 return <section className="data-reading-link"><span>公开数据研究 / MRO</span><p>289 个六维状态、原始响应与独立复算脚本；检查二体传播差值及数值积分误差。</p><a href="#/research?view=data">MRO 火星轨道复算<ArrowUpRight size={16}/></a></section>;
}
