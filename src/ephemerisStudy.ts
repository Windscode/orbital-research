/** Mars-centred inertial two-body reference. Units: km, s, km/s. */
export type Vec3=[number,number,number];
export interface EphemerisState {t_s:number;jd_tdb:number;calendar_tdb:string;r_km:Vec3;v_km_s:Vec3}
export const MARS_MU=42828.37362069909; // BODY499_GM in archived gm_de440.tpc
export const dot=(a:Vec3,b:Vec3)=>a.reduce((s,x,i)=>s+x*b[i],0);
export const norm=(a:Vec3)=>Math.hypot(...a);
export const cross=(a:Vec3,b:Vec3):Vec3=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const scale=(a:Vec3,s:number)=>a.map(x=>x*s) as Vec3;
const add=(a:Vec3,b:Vec3)=>a.map((x,i)=>x+b[i]) as Vec3;
const sub=(a:Vec3,b:Vec3)=>a.map((x,i)=>x-b[i]) as Vec3;
function check(r:Vec3,v:Vec3,mu:number){if(r.length!==3||v.length!==3||![...r,...v,mu].every(Number.isFinite)||mu<=0||norm(r)===0)throw new RangeError('Invalid Cartesian state');}
export function elements(r:Vec3,v:Vec3,mu=MARS_MU){
 check(r,v,mu);const radius=norm(r),speed=norm(v),h=cross(r,v),energy=speed**2/2-mu/radius;
 const a=-mu/(2*energy),e=norm(sub(scale(cross(v,h),1/mu),scale(r,1/radius)));
 return {radius,speed,energy,h:norm(h),a,e,period:a>0?2*Math.PI*Math.sqrt(a**3/mu):null};
}
function stumpff(z:number){
 if(Math.abs(z)<1e-7)return {c:.5-z/24+z*z/720-z**3/40320,s:1/6-z/120+z*z/5040-z**3/362880};
 if(z>0){const q=Math.sqrt(z);return {c:(1-Math.cos(q))/z,s:(q-Math.sin(q))/q**3};}
 const q=Math.sqrt(-z);return {c:(Math.cosh(q)-1)/(-z),s:(Math.sinh(q)-q)/q**3};
}
/** Universal-variable f/g solution, bounded elliptic use here; no time stepping. */
export function twoBody(r0:Vec3,v0:Vec3,t:number,mu=MARS_MU):{r:Vec3;v:Vec3}{
 check(r0,v0,mu);if(!Number.isFinite(t))throw new RangeError('Invalid propagation time');
 if(t===0)return {r:[...r0],v:[...v0]};
 const r0n=norm(r0),sm=Math.sqrt(mu),alpha=2/r0n-dot(v0,v0)/mu;
 if(alpha<=0)throw new RangeError('This study supports bound elliptic orbits only');
 let chi=sm*alpha*t,converged=false;
 for(let i=0;i<80;i++){
  const z=alpha*chi*chi,{c,s}=stumpff(z),a=dot(r0,v0)/sm;
  const f=a*chi*chi*c+(1-alpha*r0n)*chi**3*s+r0n*chi-sm*t;
  const df=a*chi*(1-z*s)+(1-alpha*r0n)*chi*chi*c+r0n;
  const delta=f/df;chi-=delta;
  if(Math.abs(delta)<1e-11*Math.max(1,Math.abs(chi))){converged=true;break;}
 }
 if(!converged)throw new Error('Universal anomaly did not converge');
 const {c,s}=stumpff(alpha*chi*chi),f=1-chi*chi*c/r0n,g=t-chi**3*s/sm;
 const r=add(scale(r0,f),scale(v0,g)),rn=norm(r),fdot=sm/(rn*r0n)*(alpha*chi**3*s-chi),gdot=1-chi*chi*c/rn;
 return {r,v:add(scale(r0,fdot),scale(v0,gdot))};
}
export function compareStates(states:EphemerisState[]){
 if(states.length<2||states[0].t_s!==0||states.some((s,i)=>!Number.isFinite(s.t_s)||(i>0&&s.t_s<=states[i-1].t_s)))throw new RangeError('Invalid time series');
 const first=states[0];return states.map(s=>{
  const model=twoBody(first.r_km,first.v_km_s,s.t_s),dr=sub(model.r,s.r_km),dv=sub(model.v,s.v_km_s);
  const radial=scale(s.r_km,1/norm(s.r_km)),normal=scale(cross(s.r_km,s.v_km_s),1/norm(cross(s.r_km,s.v_km_s))),transverse=cross(normal,radial);
  return {...s,model,derived:elements(s.r_km,s.v_km_s),positionDifference:norm(dr),velocityDifference:norm(dv),radial:dot(dr,radial),transverse:dot(dr,transverse),normal:dot(dr,normal)};
 });
}
/** RK4 only for separating numerical error from force-model discrepancy. */
export function rk4End(r0:Vec3,v0:Vec3,duration:number,step:number,mu=MARS_MU){
 check(r0,v0,mu);if(!Number.isFinite(duration)||!Number.isFinite(step)||duration<0||duration>86400||step<1||step>300)throw new RangeError('Unsupported integration interval');
 let state=[...r0,...v0];
 const d=(s:number[])=>{const q=-mu/Math.hypot(...s.slice(0,3))**3;return [...s.slice(3),s[0]*q,s[1]*q,s[2]*q];};
 const plus=(s:number[],k:number[],h:number)=>s.map((x,i)=>x+h*k[i]);
 for(let t=0;t<duration;){const h=Math.min(step,duration-t),a=d(state),b=d(plus(state,a,h/2)),c=d(plus(state,b,h/2)),e=d(plus(state,c,h));state=state.map((x,i)=>x+h*(a[i]+2*b[i]+2*c[i]+e[i])/6);t+=h;}
 return {r:state.slice(0,3) as Vec3,v:state.slice(3) as Vec3};
}
