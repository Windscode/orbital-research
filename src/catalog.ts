import {useEffect,useState} from 'react';
import bootstrap from '../research/home-bootstrap.json';
import type {Briefing,KnowledgeGraphData,Lesson,ResearchWorkflow,Resource,Vehicle} from './types';
import {cachedResource} from './cachedResource';
export interface ResearchCatalog {lessons:Lesson[];resources:Resource[];vehicles:Vehicle[];briefings:Briefing[];graph:KnowledgeGraphData;workflows:ResearchWorkflow[]}
export const catalogCounts=bootstrap.counts;
// This is deliberately a homepage subset, not a claim that the catalog is complete.
export const homeCatalog:ResearchCatalog={lessons:[],resources:bootstrap.resources as Resource[],vehicles:[],briefings:bootstrap.briefings as Briefing[],graph:{domains:[],nodes:[],edges:[],paths:[]},workflows:[]};
const catalogResource=cachedResource(()=>import('./catalogData').then(module=>module.catalog));
export const loadResearchCatalog=catalogResource.load;
export function useResearchCatalog(needed:boolean){
 const completed=catalogResource.peek();
 const [data,setData]=useState(completed??homeCatalog),[status,setStatus]=useState<'idle'|'loading'|'ready'|'error'>(completed?'ready':'idle'),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  if(!needed||status==='ready')return;
  let current=true;setStatus('loading');
  loadResearchCatalog().then(value=>{if(current){setData(value);setStatus('ready');}},()=>{if(current)setStatus('error');});
  return()=>{current=false;};
 },[needed,attempt]);
 return {data,status,retry:()=>setAttempt(n=>n+1)};
}
