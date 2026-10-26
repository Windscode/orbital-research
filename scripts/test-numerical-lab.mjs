import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const root=new URL('../',import.meta.url);
const compile=async file=>ts.transpileModule(await readFile(new URL(file,root),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const data=s=>`data:text/javascript;base64,${Buffer.from(s).toString('base64')}`;
const orbitUrl=data(await compile('src/orbit.ts'));
const {EARTH_MU:mu,EARTH_RADIUS:R,orbitElements}=await import(orbitUrl);
const lib=await import(data((await compile('src/orbitExperiment.ts')).replace("'./orbit'",JSON.stringify(orbitUrl))));
const {analyticState,invariants,integrateStep,propagateExperiment,runOrbitExperiment,validateExperiment,INTEGRATORS}=lib;
let passes=0;
const test=(name,fn)=>{fn();passes++;console.log(`PASS: ${name}`);};
const close=(a,b,tol)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=tol,`${a} differs from ${b} by more than ${tol}`);
test('circular reference matches trigonometric solution for position and velocity',()=>{
 const r=R+400,n=Math.sqrt(mu/r**3),v=Math.sqrt(mu/r);
 for(const t of [0,100,2000,10000,50000]){
  const s=analyticState(t,400,400),theta=n*t;
  [r*Math.cos(theta),r*Math.sin(theta),-v*Math.sin(theta),v*Math.cos(theta)].forEach((expected,i)=>close(s[i],expected,i<2?1e-7:1e-10));
 }
});
test('elliptical reference satisfies energy and angular momentum over all UI presets',()=>{
 for(const apogee of [400,2000,35786]){
  const o=orbitElements(400,apogee);
  for(let i=0;i<=200;i++){
   const s=analyticState(o.period*i/37,400,apogee),inv=invariants(s);
   close(inv.energy,-mu/(2*o.a),1e-10);close(inv.momentum,Math.sqrt(mu*o.a*(1-o.e**2)),1e-7);
  }
 }
});
test('step refinement approaches expected global orders on a circular orbit',()=>{
 const r=runOrbitExperiment({perigee:400,apogee:400,step:10,periods:1});
 for(const c of r.convergence){
  const expected={euler:1,rk4:4,verlet:2}[c.method];
  assert.ok(Math.abs(c.observedOrder-expected)<.2,`${c.method}: observed ${c.observedOrder}`);
 }
 console.log('Measured orders:',r.convergence.map(c=>`${c.method}=${c.observedOrder.toFixed(4)}`).join(', '));
});
test('Verlet reverses a step and conserves angular momentum for central forces',()=>{
 const s=analyticState(510,400,2000),next=integrateStep(s,60,'verlet'),back=integrateStep(next,-60,'verlet');
 s.forEach((v,i)=>close(back[i],v,1e-11));close(invariants(next).momentum,invariants(s).momentum,1e-8);
 const r=propagateExperiment({perigee:400,apogee:2000,step:60,periods:10},'verlet');
 assert.ok(r.maxMomentumError<1e-12);assert.ok(r.maxPositionError>1,'A small momentum error must not be interpreted as exact position.');
});
test('all methods reach exactly the same terminal time; work counters reflect implementations',()=>{
 const config={perigee:400,apogee:400,step:60,periods:3},duration=orbitElements(400,400).period*3;
 for(const method of INTEGRATORS){
  const r=propagateExperiment(config,method);assert.equal(r.status,'complete');assert.equal(r.finalTime,duration);
  assert.equal(r.steps,Math.ceil(duration/60));assert.equal(r.forceEvaluations,r.steps*({euler:1,rk4:4,verlet:2}[method]));assert.equal(r.samples.at(-1).t,duration);
 }
});
test('every UI combination returns bounded, finite data and explicit stopped status',()=>{
 let stopped=0;
 for(const apogee of [400,2000,35786])for(const step of [10,30,60,120,240])for(const periods of [1,3,10]){
  const result=runOrbitExperiment({perigee:400,apogee,step,periods});
  for(const r of result.methods){
   assert.ok(r.samples.length<=802);assert.ok(r.samples.length>=2);assert.ok(r.finalTime<=result.duration);
   assert.equal(r.samples.at(-1).t,r.finalTime);
   for(const s of r.samples)assert.ok(Object.values(s).every(Number.isFinite));
   for(const key of ['maxPositionError','finalPositionError','maxEnergyError','maxMomentumError'])assert.ok(Number.isFinite(r[key]));
   assert.ok(r.maxPositionError>=Math.max(...r.samples.map(s=>s.positionError)));
   if(r.status==='stopped'){stopped++;assert.ok(r.reason);assert.ok(r.finalTime<result.duration);}
  }
  assert.ok(result.convergence.every(c=>c.observedOrder===null||Number.isFinite(c.observedOrder)));
  assert.deepEqual(JSON.parse(JSON.stringify(result)),result,'Report must round-trip without NaN or Infinity becoming null.');
 }
 console.log(`45 UI configurations × 3 methods; ${stopped} explicitly stopped runs.`);
});
test('decimated plots do not change all-step maximum metrics',()=>{
 const c={perigee:400,apogee:2000,step:10,periods:3},r=propagateExperiment(c,'rk4'),o=orbitElements(c.perigee,c.apogee);
 assert.ok(r.sampleStride>1);let s=[o.rp,0,0,o.vp],t=0,peak=0;
 for(let i=1;i<=r.steps;i++){
  const nextT=Math.min(i*c.step,r.finalTime);s=integrateStep(s,nextT-t,'rk4');t=nextT;
  const reference=analyticState(t,c.perigee,c.apogee);peak=Math.max(peak,Math.hypot(s[0]-reference[0],s[1]-reference[1]));
 }
 close(r.maxPositionError,peak,1e-10);assert.ok(r.maxPositionError>=Math.max(...r.samples.map(s=>s.positionError)));
});
test('invalid, incomplete or excessive workloads are rejected before calculation',()=>{
 const base={perigee:400,apogee:2000,step:60,periods:3};
 for(const patch of [{perigee:NaN},{apogee:300},{step:0},{step:Infinity},{step:undefined},{periods:11},{perigee:199},{apogee:36001},{apogee:36000,periods:10,step:1.25}])assert.throws(()=>validateExperiment({...base,...patch}),RangeError);
 assert.throws(()=>validateExperiment(null),RangeError);assert.throws(()=>runOrbitExperiment({...base,step:2}),RangeError);
 assert.throws(()=>propagateExperiment(base,'unknown'),RangeError);assert.throws(()=>integrateStep([0,0,1,1],10,'rk4'),RangeError);
});
const notes=JSON.parse(await readFile(new URL('research/numerical-lab.json',root),'utf8'));
const lessons=JSON.parse(await readFile(new URL('research/learning.json',root),'utf8'));
test('research notes resolve to existing lessons and eight attributed primary sources',()=>{
for(const l of notes.relatedLessons)assert.ok(lessons.some(x=>x.id===l.id));
assert.equal(notes.sources.length,8);assert.equal(new Set(notes.sources.map(s=>s.url)).size,8);
for(const s of notes.sources){assert.ok(s.title&&s.supports&&s.version);assert.equal(new URL(s.url).protocol,'https:');}
assert.equal(notes.questions.length,6);
});
console.log(`Numerical laboratory checks: ${passes} passed.`);
