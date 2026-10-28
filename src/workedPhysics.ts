/** SI units throughout. These are reduced reference problems, not UE solver results. */
export const SIGMA = 5.670374419e-8;
export type ThermalInput={c1:number;c2:number;t1:number;t2:number;g:number;duration:number;dt:number};
export type RadiationInput={area:number;power:number;alpha:number;epsilon:number;solar:number;cosine:number;albedo:number;earthView:number;earthIR:number};
export type InertiaInput={mass:number;radius:number;fraction:number;offset:number;torque:number};
export const thermalDefault:ThermalInput={c1:100,c2:300,t1:300,t2:260,g:2,duration:150,dt:15};
export const radiationDefault:RadiationInput={area:.2,power:50,alpha:.2,epsilon:.8,solar:1361,cosine:.5,albedo:100,earthView:.3,earthIR:234};
export const inertiaDefault:InertiaInput={mass:83.6,radius:.29,fraction:.25,offset:.15,torque:.01};
function finite(p:object){if(Object.values(p).some(n=>typeof n!=='number'||!Number.isFinite(n)))throw new RangeError('参数必须是有限数值');}
export function thermalReference(p:ThermalInput){
 finite(p);if(p.c1<=0||p.c2<=0||p.t1<0||p.t2<0||p.g<0||p.dt<=0||p.duration<=0||p.duration/p.dt>10000)throw new RangeError('热模型输入超出范围');
 const total=p.c1+p.c2,e0=p.c1*p.t1+p.c2*p.t2,equilibrium=e0/total,lambda=p.g*(1/p.c1+1/p.c2),tau=lambda?1/lambda:Infinity;
 const exact=(time:number)=>{const difference=(p.t1-p.t2)*Math.exp(-lambda*time);return {time,t1:equilibrium+p.c2/total*difference,t2:equilibrium-p.c1/total*difference};};
 const analytical=Array.from({length:121},(_,i)=>exact(p.duration*i/120));
 let a=p.t1,b=p.t2,time=0;const numerical=[{time,t1:a,t2:b,error:0,energyResidual:0}];
 while(time<p.duration){const h=Math.min(p.dt,p.duration-time),q=p.g*(a-b)*h;a-=q/p.c1;b+=q/p.c2;time=Math.min(p.duration,time+h);const ref=exact(time);numerical.push({time,t1:a,t2:b,error:Math.max(Math.abs(a-ref.t1),Math.abs(b-ref.t2)),energyResidual:p.c1*a+p.c2*b-e0});}
 const z=p.dt*lambda,stability=z===0?'no-exchange':z<=1?'monotone':z<2?'oscillatory':z===2?'neutral':'unstable';
 return {equilibrium,tau,amplification:1-z,stability,analytical,numerical,finalExact:exact(p.duration),finalNumerical:numerical.at(-1)!,maxError:Math.max(...numerical.map(r=>r.error)),maxEnergyResidual:Math.max(...numerical.map(r=>Math.abs(r.energyResidual)))};
}
export function radiationReference(p:RadiationInput){
 finite(p);if(p.area<=0||p.power<0||p.alpha<0||p.alpha>1||p.epsilon<=0||p.epsilon>1||p.solar<0||p.cosine<0||p.cosine>1||p.albedo<0||p.earthView<0||p.earthView>1||p.earthIR<0)throw new RangeError('辐射模型输入超出范围');
 const solar=p.alpha*p.area*p.solar*p.cosine,albedo=p.alpha*p.area*p.albedo,earth=p.epsilon*p.area*p.earthView*p.earthIR,total=p.power+solar+albedo+earth,temperature=(total/(p.epsilon*SIGMA*p.area))**.25;
 return {solar,albedo,earth,internal:p.power,total,temperature,celsius:temperature-273.15,emission:p.epsilon*SIGMA*p.area*temperature**4};
}
export function inertiaReference(p:InertiaInput){
 finite(p);if(p.mass<=0||p.radius<=0||p.fraction<0||p.fraction>1||p.offset<0||p.torque<0)throw new RangeError('惯量模型输入超出范围');
 const solid=2/5*p.mass*p.radius**2,shell=2/3*p.mass*p.radius**2,core=(1-p.fraction)*shell,shift=p.mass*p.fraction*p.offset**2;
 const models=[{id:'solid',title:'均匀实心球',ix:solid,iy:solid,iz:solid},{id:'shell',title:'均匀薄球壳',ix:shell,iy:shell,iz:shell},{id:'distributed',title:'球壳与对置集中质量',ix:core,iy:core+shift,iz:core+shift}].map(m=>({...m,angularAcceleration:m.iy>0?p.torque/m.iy:null}));
 return {models,movedMass:p.mass*p.fraction,eachPointMass:p.mass*p.fraction/2,shift};
}
