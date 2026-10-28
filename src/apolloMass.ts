export const LB_KG=.45359237,IN_M=.0254,SLUG_FT2_KGM2=1.3558179483314;
export const apolloSeparation={
 cm:{massLb:12107.4,cgIn:[1040.4,-.2,6],inertia:[6260,5470,4995]},
 sm:{massLb:14549.1,cgIn:[896.1,.1,7.2],inertia:[9143,14540,16616]},
 before:{massLb:26656.5,cgIn:[961.6,0,6.7],inertia:[15406,49739,51338]}
};
export function combineApollo(parallelAxis=true){
 const parts=[apolloSeparation.cm,apolloSeparation.sm],mass=parts.reduce((sum,p)=>sum+p.massLb*LB_KG,0);
 const cg=[0,1,2].map(k=>parts.reduce((sum,p)=>sum+p.massLb*LB_KG*p.cgIn[k]*IN_M,0)/mass);
 const inertia=[0,1,2].map(k=>parts.reduce((sum,p)=>{const d=p.cgIn.map((v,i)=>v*IN_M-cg[i]);return sum+p.inertia[k]*SLUG_FT2_KGM2+(parallelAxis?p.massLb*LB_KG*d.reduce((s,v,i)=>s+(i===k?0:v*v),0):0);},0));
 return {mass,cg,inertia};
}
