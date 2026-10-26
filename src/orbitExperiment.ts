import {EARTH_MU,EARTH_RADIUS,keplerPosition,orbitElements} from './orbit';
export type Integrator='euler'|'rk4'|'verlet';
export type OrbitState=[number,number,number,number];
export interface ExperimentConfig {perigee:number;apogee:number;step:number;periods:number}
export interface OrbitSample {t:number;x:number;y:number;vx:number;vy:number;positionError:number;energyError:number;momentumError:number}
export interface MethodResult {method:Integrator;status:'complete'|'stopped';reason:string;steps:number;forceEvaluations:number;samples:OrbitSample[];maxPositionError:number;finalPositionError:number;maxEnergyError:number;maxMomentumError:number;finalTime:number;sampleStride:number}
export interface ExperimentResult {config:ExperimentConfig;period:number;duration:number;initialState:OrbitState;methods:MethodResult[];convergence:{method:Integrator;rows:{step:number;error:number|null;steps:number;status:MethodResult['status']}[];observedOrder:number|null;orderNote:string}[]}
export const INTEGRATORS:Integrator[]=['euler','rk4','verlet'];
const FORCE_COST={euler:1,rk4:4,verlet:2};
export function analyticState(t:number,perigee:number,apogee:number):OrbitState{
 const o=orbitElements(perigee,apogee),n=2*Math.PI/o.period,p=keplerPosition(n*t,o.e),cosE=p.x+o.e,sinE=p.y/Math.sqrt(1-o.e*o.e),dE=n/(1-o.e*cosE);
 return [o.a*p.x,o.a*p.y,-o.a*sinE*dE,o.a*Math.sqrt(1-o.e*o.e)*cosE*dE];
}
export function invariants(s:OrbitState){return {energy:(s[2]**2+s[3]**2)/2-EARTH_MU/Math.hypot(s[0],s[1]),momentum:s[0]*s[3]-s[1]*s[2]};}
function acceleration(x:number,y:number):[number,number]{const c=-EARTH_MU/Math.hypot(x,y)**3;return [c*x,c*y];}
function derivative(s:OrbitState):OrbitState{const a=acceleration(s[0],s[1]);return [s[2],s[3],a[0],a[1]];}
function add(s:OrbitState,k:OrbitState,h:number):OrbitState{return s.map((v,i)=>v+h*k[i]) as OrbitState;}
export function integrateStep(s:OrbitState,h:number,method:Integrator):OrbitState{
 if(!Number.isFinite(h)||h===0||!s.every(Number.isFinite)||Math.hypot(s[0],s[1])===0)throw new RangeError('Invalid integration state or step');
 if(method==='euler')return add(s,derivative(s),h);
 if(method==='rk4'){
  const a=derivative(s),b=derivative(add(s,a,h/2)),c=derivative(add(s,b,h/2)),d=derivative(add(s,c,h));
  return s.map((v,i)=>v+h*(a[i]+2*b[i]+2*c[i]+d[i])/6) as OrbitState;
 }
 if(method==='verlet'){
  const a=acceleration(s[0],s[1]),x=s[0]+h*s[2]+h*h*a[0]/2,y=s[1]+h*s[3]+h*h*a[1]/2,b=acceleration(x,y);
  return [x,y,s[2]+h*(a[0]+b[0])/2,s[3]+h*(a[1]+b[1])/2];
 }
 throw new RangeError('Unknown integrator');
}
export function validateExperiment(c:ExperimentConfig){
 if(!c||![c.perigee,c.apogee,c.step,c.periods].every(Number.isFinite)||c.perigee<200||c.perigee>2000||c.apogee<c.perigee||c.apogee>36000||c.step<1.25||c.step>240||c.periods<.25||c.periods>10)throw new RangeError('Experiment is outside the supported domain');
 if(Math.ceil(orbitElements(c.perigee,c.apogee).period*c.periods/c.step)>100000)throw new RangeError('Integration budget exceeded');
}
export function propagateExperiment(c:ExperimentConfig,method:Integrator,duration?:number):MethodResult{
 validateExperiment(c);if(!INTEGRATORS.includes(method))throw new RangeError('Unknown integrator');
 const o=orbitElements(c.perigee,c.apogee),end=duration??o.period*c.periods;
 if(!Number.isFinite(end)||end<=0||end>o.period*10)throw new RangeError('Invalid experiment duration');
 const n=Math.ceil(end/c.step);if(n>100000)throw new RangeError('Integration budget exceeded');
 const stride=Math.max(1,Math.ceil(n/800));let state:OrbitState=[o.rp,0,0,o.vp],t=0;
 const inv0=invariants(state);
 const result:MethodResult={method,status:'complete',reason:'到达共同终止时刻',steps:0,forceEvaluations:0,samples:[],maxPositionError:0,finalPositionError:0,maxEnergyError:0,maxMomentumError:0,finalTime:0,sampleStride:stride};
 function measure(keep:boolean){
  const reference=analyticState(t,c.perigee,c.apogee),inv=invariants(state);
  const p=Math.hypot(state[0]-reference[0],state[1]-reference[1]),e=(inv.energy-inv0.energy)/Math.abs(inv0.energy),h=(inv.momentum-inv0.momentum)/Math.abs(inv0.momentum);
  result.maxPositionError=Math.max(result.maxPositionError,p);result.maxEnergyError=Math.max(result.maxEnergyError,Math.abs(e));result.maxMomentumError=Math.max(result.maxMomentumError,Math.abs(h));result.finalPositionError=p;result.finalTime=t;
  if(keep)result.samples.push({t,x:state[0],y:state[1],vx:state[2],vy:state[3],positionError:p,energyError:e,momentumError:h});
 }
 measure(true);
 for(let i=1;i<=n;i++){
  const nextT=i===n?end:i*c.step,dt=nextT-t;
  const next=integrateStep(state,dt,method);result.forceEvaluations+=FORCE_COST[method];
  if(!next.every(Number.isFinite)||Math.hypot(next[0],next[1])===0){result.status='stopped';result.reason='非有限或奇异状态，已停止；保留最后有效状态';break;}
  state=next;t=nextT;result.steps++;
  const belowSurface=Math.hypot(state[0],state[1])<=EARTH_RADIUS;
  measure(i%stride===0||i===n||belowSurface);
  if(belowSurface){result.status='stopped';result.reason='离散步末状态进入地球示意半径，停止本教学实验；未做连续碰撞事件定位';break;}
 }
 if(result.samples.at(-1)?.t!==t)measure(true);
 return result;
}
export function runOrbitExperiment(config:ExperimentConfig):ExperimentResult{
 validateExperiment(config);if(config.step<5)throw new RangeError('Refinement requires a base step of at least 5 s');const o=orbitElements(config.perigee,config.apogee),duration=o.period*config.periods;
 const methods=INTEGRATORS.map(m=>propagateExperiment(config,m));
 // A separate one-period interval prevents a changed study horizon from changing the convergence comparison.
 const convergence=INTEGRATORS.map(method=>{
  const rows=[1,.5,.25].map(factor=>{
   // Each refinement is evaluated over exactly one reference period.
   const step=config.step*factor;
   const result=propagateRefined(config,method,step,o.period);
   return {step,error:result.status==='complete'?result.maxPositionError:null,steps:result.steps,status:result.status};
  });
  const [coarse,middle,fine]=rows.map(r=>r.error);
  const observedOrder=coarse!==null&&middle!==null&&fine!==null&&coarse>middle&&middle>fine&&fine>1e-9?Math.log2(middle/fine):null;
  const orderNote=rows.some(r=>r.status==='stopped')?'至少一档提前停止':fine!==null&&fine<=1e-9?'接近参考解或浮点精度下限':observedOrder===null?'三档误差未单调减小':'由中、细两档的全步最大位置误差估计；不是通用阶数证明';
  return {method,rows,observedOrder,orderNote};
 });
 return {config:{...config},period:o.period,duration,initialState:[o.rp,0,0,o.vp],methods,convergence};
}
function propagateRefined(config:ExperimentConfig,method:Integrator,step:number,duration:number){
 // Keep the refinement budget independent of the selected long-horizon run.
 return propagateExperiment({...config,step,periods:1},method,duration);
}
