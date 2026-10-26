import data from '../research/intelligence-sources-v9.json';
import type {Briefing} from './types';
export interface IntelligenceSource {id:string;name:string;url:string;type:string;region:string[];language:string[];topics:string[];evidenceRole:string;description:string;whatToLookFor:string[];queryExamples:string[];checks:string[];cadence:string;reviewedOn:string;accessNote:string;status:string;verification:{method:string;note:string};feedUrl?:string;searchUrl?:string}
export const intelligenceSources=data as IntelligenceSource[];
const host=(url:string)=>{try{return new URL(url).hostname.replace(/^www\./,'');}catch{return '';}};
/** Exact hostname and longest applicable entry path; association is discovery, not endorsement. */
export function matchIntelligenceSource(url:string,sources=intelligenceSources){
 let target:URL;try{target=new URL(url);}catch{return undefined;}
 const same=sources.filter(s=>host(s.url)===host(url));
 return same.sort((a,b)=>{const score=(s:IntelligenceSource)=>{const path=new URL(s.url).pathname.replace(/\/$/,'');return (target.pathname===path||target.pathname.startsWith(path+'/'))?path.length+1:0;};return score(b)-score(a)||a.id.localeCompare(b.id);})[0];
}
export function sourceBriefings(id:string,briefings:Briefing[]){return briefings.filter(b=>b.sourceIds?.includes(id)||[b.source,...(b.additionalSources||[])].some(s=>matchIntelligenceSource(s.url)?.id===id));}
export function parseSourceWatchlist(raw:string|null,sources=intelligenceSources){try{const value=JSON.parse(raw||'[]');return Array.isArray(value)?[...new Set(value.filter((id):id is string=>typeof id==='string'&&sources.some(s=>s.id===id)))]:[];}catch{return[];}}
export function sourceMaintenancePacket(sources:IntelligenceSource[],briefings:Briefing[],topic:string){return {format:'orbital-intelligence-maintenance',version:1,createdAt:new Date().toISOString(),topic,mode:'Manual research preparation; no feeds fetched and no new briefings automatically published',sources,existingBriefings:briefings.map(b=>({id:b.id,title:b.title,publishedOn:b.publishedOn||b.date,eventDate:b.eventDate??null,verifiedOn:b.verifiedOn,sourceIds:b.sourceIds||[],sourceUrls:[b.source,...(b.additionalSources||[])].map(s=>s.url)})),instructions:['先逐项检查来源库及其核查说明，再做主题、区域、语言与方法的补充检索。','打开原始资料，区分发布时间、事件时间、计划与已执行状态。','记录证据、用途与不确定性；按 URL、DOI、事件和版本去重。','完成核查后修改共享来源库与情报条目，保留来源状态变更及更正记录。']};}
export const sourceRoles:Record<string,string>={official:'机构原始发布',research:'研究文献',release:'版本与数据发布',reporting:'报道与线索',index:'检索与元数据'};
export const sourceStatuses:Record<string,string>={active:'持续查阅',archive:'历史档案',review:'待复核入口'};
export const verificationLabels:Record<string,string>={'page-read':'已阅读入口','search-result':'索引核对','access-limited':'访问受限'};
