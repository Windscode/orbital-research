export interface Source { title: string; url: string }
export interface Resource { id: string; title: string; category: string; kind: string; summary: string; details: string; tags: string[]; language: string; license: string; accessModel?:'open'|'source'|'commercial'|'restricted'|'data'|'standard'; url: string; docsUrl: string; sourceTitle: string; verifiedOn: string; workflow?:string[]; inputs?:string; outputs?:string; limitations?:string; usageEvidence?:{organization:string;context:string;sourceUrl:string;evidenceType:string}[]; alternatives?:string[]; starterWorkflow?:string[]; starterWorkflowStatus?:string; selectionQuestions?:string[] }
export interface Lesson { id: string; title: string; category: string; level: string; readTime: string | number; summary: string; body: string[]; formula?: string; pitfall: string; exercise: string; sources: Source[]; prerequisites?:string[]; related?:string[]; objectives?:string[]; applications?:string[]; steps?:{title:string;detail:string}[] }
export interface ModelPart { id:string; name:string; description:string; evidence:'公开结构'|'工程示意'|'未知'; sourceUrl:string }
export interface ModelReview { id:string; configuration:string; reviewedOn:string; changes:string[]; features:{title:string;detail:string;partId:string;sourceUrl:string}[]; uncertainties:string[]; sources:Source[] }
export interface VehicleModel { kind:'sphere-satellite'|'cylinder-satellite'|'capsule'|'apollo'|'lander'|'shuttle'|'station'|'probe'|'telescope'|'rover'|'rocket'; height:number; diameter:number; boosters?:number; stages?:number; solarPanels?:number; antennas?:number; engineCount?:number; crewCount?:number; color:string; parts:ModelPart[]; disclaimer:string; review?:ModelReview }
export interface Vehicle { id: string; name: string; organization: string; type: string; status: string; summary: string; dimensions: {label:string;value:string;sourceUrl:string}[]; publicData: {parameter:string;value:string;sourceUrl:string}[]; inference: {parameter:string;method:string;assumptions:string;uncertainty:string}[]; limitations:string[]; sources:Source[]; verifiedOn:string; year?:number; country?:string; family?:string; mission?:string; history?:string[]; systems?:{name:string;function:string;evidence:string;sourceUrl:string}[]; model?:VehicleModel; studyQuestions?:string[]; dataProducts?:{name:string;url:string;description:string}[] }
export interface KnowledgeGraphData { domains:{id:string;label:string;color:string;description:string}[]; nodes:{id:string;label:string;domain:string;level:1|2|3}[]; edges:{from:string;to:string;type:'prerequisite'|'coupling'|'validation';reason:string}[]; paths:{id:string;title:string;description:string;nodeIds:string[]}[] }
export interface Briefing { id:string; title:string; category:string; date:string; summary:string; analysis:string; implication:string; source:Source; tags:string[]; dateNote?:string; publishedOn?:string; eventDate?:string|null; eventDateNote?:string; verifiedOn?:string; additionalSources?:Source[]; relatedResources?:string[]; sourceIds?:string[] }
export interface Project { name:string; subtitle:string; summary:string; engine:string; architecture:{title:string;body:string}[]; capabilities:{title:string;body:string;status:string}[]; evidence:{title:string;body:string;path:string}[]; limitations:string[]; researchDirections:{title:string;body:string}[]; localPath:string }
export type Detail = { kind:'resource'; item:Resource } | { kind:'lesson'; item:Lesson } | { kind:'vehicle'; item:Vehicle } | { kind:'briefing'; item:Briefing } | { kind:'about' };
export interface ResearchWorkflow {
 id:string;code:string;title:string;shortTitle:string;question:string;summary:string;domain:string;level:string;deliverable:string;verifiedOn:string;boundary:string;
 lessonIds:string[];resourceIds:string[];vehicleIds:string[];
 contract:{field:string;value:string;why:string}[];
 steps:{id:string;title:string;detail:string;output:string;check:string}[];
 validation:string[];pitfalls:string[];sources:Source[];
}
export interface ResearchDossier {
 id:string;code:string;title:string;summary:string;question:string;domains:string[];
 lessonIds:string[];resourceIds:string[];vehicleIds:string[];workflowIds:string[];briefingIds:string[];
 modelScope:{level:string;model:string;inputs:string;outputs:string;limits:string}[];
 investigation:{title:string;detail:string;deliverable:string;check:string}[];
 dataChecklist:string[];commonErrors:string[];sources:Source[];reviewedOn:string;
}
