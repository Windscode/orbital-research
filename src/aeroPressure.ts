/** Published 2-D pressures, integrated in chord axes. No flow solver is run here. */
export interface PressurePoint {index:number;x:number;y:number;cp:number;surface:'lower'|'leading-edge'|'upper'}
export interface AeroCase {alpha_deg:number;points:PressurePoint[];published:{cl:number;cd:number};reference:{CAp:number;CNp:number;CLp:number;CDp:number}}
export interface AeroDataset {metadata:{id:string;retrieved:string;geometry:{status:string};sources:{title:string;url:string}[];inputFiles:{file:string;url:string;sha256:string;bytes:number}[]};cases:AeroCase[]}
export const samplingStrides=[1,2,4,8,16,32,64];
export function airfoilY(x:number){
 if(x<0||x>1||!Number.isFinite(x))throw new Error('x/c 必须在 0 到 1 之间');
 if(x===0||x===1)return 0;
 return .594689181*(.298222773*Math.sqrt(x)-.127125232*x-.357907906*x*x+.291984971*x**3-.105174696*x**4);
}
export function pressurePanel(a:PressurePoint,b:PressurePoint,alphaDeg:number){
 const cp=(a.cp+b.cp)/2,dx=b.x-a.x,dy=b.y-a.y,alpha=alphaDeg*Math.PI/180;
 const ca=cp*dy,cn=-cp*dx;
 return {a,b,cp,dx,dy,ca,cn,cl:cn*Math.cos(alpha)-ca*Math.sin(alpha),cd:cn*Math.sin(alpha)+ca*Math.cos(alpha)};
}
export function integratePressure(points:PressurePoint[],alphaDeg:number,stride=1){
 if(!samplingStrides.includes(stride)||points.length!==513||!Number.isFinite(alphaDeg))throw new Error('不支持的积分输入');
 const retained=points.filter((_,i)=>i%stride===0);
 const panels=retained.slice(0,-1).map((a,i)=>pressurePanel(a,retained[i+1],alphaDeg));
 const total=panels.reduce((s,p)=>({ca:s.ca+p.ca,cn:s.cn+p.cn,cl:s.cl+p.cl,cd:s.cd+p.cd}),{ca:0,cn:0,cl:0,cd:0});
 return {...total,panels,retained,stride};
}
export function validateAeroDataset(value:unknown):AeroDataset {
 const d=value as AeroDataset;
 if(d?.metadata?.id!=='naca0012-cfl3d-sa-pressure'||d.cases?.length!==3)throw new Error('数据标识或工况不匹配');
 d.cases.forEach((c,k)=>{
  if(c.alpha_deg!==[0,10,15][k]||c.points?.length!==513||![c.published?.cl,c.published?.cd].every(Number.isFinite))throw new Error('数据工况不完整');
  c.points.forEach((p,i)=>{
   if(p.index!==i||![p.x,p.y,p.cp].every(Number.isFinite)||p.x<0||p.x>1)throw new Error('数据包含无效表面点');
   const y=i<256?-airfoilY(p.x):airfoilY(p.x);
   if(Math.abs(p.y-y)>1e-12||(i>0&&i<=256&&p.x>=c.points[i-1].x)||(i>256&&p.x<=c.points[i-1].x))throw new Error('表面几何或原始点序不匹配');
  });
  if(c.points[0].x!==1||c.points[256].x!==0||c.points[512].x!==1)throw new Error('翼型轮廓未闭合');
 });
 return d;
}
