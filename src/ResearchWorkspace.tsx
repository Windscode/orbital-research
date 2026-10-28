import {lazy,Suspense,useEffect,useState} from 'react';
import type {ResearchCatalog} from './catalog';
import type {Detail} from './types';
const DataStudy=lazy(()=>import('./DataStudy'));
const WorkedExamples=lazy(()=>import('./WorkedExamples'));
const ResearchDossiers=lazy(()=>import('./ResearchDossiers'));
const getView=()=>{const p=new URLSearchParams(location.hash.split('?')[1]);return p.has('topic')||p.get('view')==='routes'?'routes':p.get('view')==='examples'?'examples':'data';};
export default function ResearchWorkspace(props:{catalog:ResearchCatalog;onRead:(d:Detail)=>void;completed:string[]}){
 const [view,setView]=useState(getView);
 useEffect(()=>{const change=()=>{const next=getView();setView(next);if(next!==view)window.scrollTo({top:0,behavior:'instant'});};window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change);},[view]);
 return <><nav className="research-view-switch" aria-label="研究内容类型"><a href="#/research?view=data" aria-current={view==='data'?'page':undefined}>公开数据研究<span>原始数据与计算记录</span></a><a href="#/research?view=examples" aria-current={view==='examples'?'page':undefined}>计算算例<span>可运行与复算</span></a><a href="#/research?view=routes" aria-current={view==='routes'?'page':undefined}>研究路线<span>资料与实施计划</span></a></nav><Suspense fallback={<p className="content-wrap">正在加载研究内容…</p>}>{view==='data'?<DataStudy/>:view==='examples'?<WorkedExamples/>:<ResearchDossiers {...props}/>}</Suspense></>;
}
