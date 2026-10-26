import {assetUrl} from './assetUrl';
export type MediaKind = '实拍影像' | '官方示意' | '原理图解' | '生成概念';
export interface ResearchMedia {
  id:string; title:string; src:string; alt:string; caption:string; credit:string;
  sourceUrl:string; assetUrl:string; kind:MediaKind; licenseNote:string;
  verifiedOn:string; vehicleIds?:string[]; lessonIds?:string[];
  focus?:string; fit?:'cover'|'contain'; rightsUrl?:string;
}
const documents=import.meta.glob('../research/media-*.json',{eager:true,import:'default'});
const editorialOrder=['webb-lights-out-inspection','apollo-lm-eagle-return','diagram-six-dof-coupling','concept-spacecraft-study','saturn-v-apollo11-launch','diagram-reference-frames','diagram-two-body-orbit','concept-lunar-horizon'];
export const mediaItems=(Object.values(documents).flatMap(value=>Array.isArray(value)?value:[]) as ResearchMedia[]).map(item=>({...item,src:assetUrl(item.src)})).sort((a,b)=>{
  const ai=editorialOrder.indexOf(a.id),bi=editorialOrder.indexOf(b.id);
  return (ai<0?100:ai)-(bi<0?100:bi);
});
export const vehicleImages=(id:string)=>mediaItems.filter(m=>m.vehicleIds?.includes(id));
export const lessonImages=(id:string)=>mediaItems.filter(m=>m.lessonIds?.includes(id));
export const conceptImage=mediaItems.find(m=>m.id==='concept-spacecraft-study');
