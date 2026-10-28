import {lazy,Suspense,useEffect,useState} from 'react';
import type {ResearchCatalog} from './catalog';
import type {Detail} from './types';
const DataStudy=lazy(()=>import('./DataStudy'));
const AeroStudy=lazy(()=>import('./AeroStudy'));
const StudyIndex=lazy(()=>import('./StudyIndex'));
const WorkedExamples=lazy(()=>import('./WorkedExamples'));
const ResearchDossiers=lazy(()=>import('./ResearchDossiers'));
const getView=()=>{const p=new URLSearchParams(location.hash.split('?')[1]);return p.has('topic')||p.get('view')==='routes'?'routes':p.get('view')==='examples'?'examples':p.get('view')==='data'?(p.get('case')==='naca0012'?'aero':'data'):'index';};
export default function ResearchWorkspace(props:{catalog:ResearchCatalog;onRead:(d:Detail)=>void;completed:string[]}){
 const [view,setView]=useState(getView);
 useEffect(()=>{const change=()=>{const next=getView();setView(next);if(next!==view)window.scrollTo({top:0,behavior:'instant'});};window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change);},[view]);
 return <><nav className="research-view-switch" aria-label="研究内容类型"><a href="#/research" aria-current={view==='index'?'page':undefined}>研究索引<span>按问题选择算例</span></a><a href="#/research?view=data&case=naca0012" aria-current={view==='aero'?'page':undefined}>NACA 0012<span>压力与气动力</span></a><a href="#/research?view=data" aria-current={view==='data'?'page':undefined}>MRO 星历<span>轨道与数值误差</span></a><a href="#/research?view=examples" aria-current={view==='examples'?'page':undefined}>解析基准<span>换热、辐射与惯量</span></a><a href="#/research?view=routes" aria-current={view==='routes'?'page':undefined}>研究路线<span>资料与实施计划</span></a></nav><Suspense fallback={<p className="content-wrap">正在加载研究内容…</p>}>{view==='index'?<StudyIndex/>:view==='aero'?<AeroStudy/>:view==='data'?<DataStudy/>:view==='examples'?<WorkedExamples/>:<ResearchDossiers {...props}/>}</Suspense></>;
}
