import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {loadTypeScript} from './load-typescript.mjs';
const {thermalReference:t,radiationReference:r,inertiaReference:i,thermalDefault:td,radiationDefault:rd,inertiaDefault:id}=loadTypeScript('src/workedPhysics.ts');
const close=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<=tol,`${a} != ${b} (tol=${tol})`);
const thermal=t(td);close(thermal.equilibrium,270);close(thermal.tau,37.5);close(thermal.finalExact.t1,270.54946916666205);close(thermal.finalExact.t2,269.81684361111263);
// Independent scalar amplification reference, not a duplicated two-state update.
for(const dt of [1,5,15,30,50,75]){
 const result=t({...td,dt}),delta=40*(1-dt/37.5)**(150/dt);
 close(result.finalNumerical.t1,270+.75*delta);close(result.finalNumerical.t2,270-.25*delta);
 assert.ok(result.maxEnergyResidual<1e-8);
}
assert.equal(t({...td,dt:50}).stability,'oscillatory');assert.equal(t({...td,dt:75}).stability,'neutral');assert.equal(t({...td,dt:90}).stability,'unstable');
close(t({...td,dt:75}).finalNumerical.t1,300);close(t({...td,dt:75}).finalNumerical.t2,260);
const e1=t({...td,dt:5}).finalNumerical.error,e2=t({...td,dt:2.5}).finalNumerical.error;assert.ok(e1/e2>1.8&&e1/e2<2.2,'first-order convergence');
for(const dt of [7,19,90])assert.equal(t({...td,dt}).finalNumerical.time,150);
const isolated=t({...td,g:0});assert.equal(isolated.stability,'no-exchange');close(isolated.finalNumerical.t1,300);close(isolated.finalNumerical.t2,260);
close(t({...td,t1:280,t2:280}).finalNumerical.error,0);
const rad=r(rd);close(rad.total,92.452);close(rad.temperature,317.721165747108,1e-6);close(rad.emission,rad.total);close(r({...rd,cosine:0,albedo:0,earthView:0}).temperature,272.464277566,1e-6);
// Quadruple all power by scaling area and internal dissipation: temperature unchanged.
close(r({...rd,area:rd.area*4,power:rd.power*4}).temperature,rad.temperature);
assert.ok(r({...rd,alpha:.4}).temperature>rad.temperature);close(r({...rd,power:0,solar:0,albedo:0,earthView:0}).temperature,0);
const mass=i(id);close(mass.models[0].iy,2.812304);close(mass.models[1].iy,4.687173333333333);close(mass.models[2].iy,3.98563);
const moved=i({...id,offset:.25});close(moved.models[2].ix,mass.models[2].ix);close(moved.models[2].iy-mass.models[2].iy,id.mass*id.fraction*(.25**2-.15**2));
for(const model of mass.models){assert.ok(model.ix+model.iy>=model.iz);close(model.iy*model.angularAcceleration,id.torque);}
for(const bad of [{c1:0},{dt:0},{g:-1},{t1:NaN},{duration:Infinity},{duration:1e9}])assert.throws(()=>t({...td,...bad}),RangeError);
for(const bad of [{epsilon:0},{earthView:2},{area:0},{power:-1},{alpha:NaN}])assert.throws(()=>r({...rd,...bad}),RangeError);
for(const bad of [{mass:0},{fraction:2},{radius:-1},{offset:NaN}])assert.throws(()=>i({...id,...bad}),RangeError);
// Verify the separate, downloadable Python implementation on changed inputs too.
mkdirSync('test-results',{recursive:true});
for(const [name,parameters,run]of [['thermal-contact',td,t],['thermal-contact',{...td,g:0},t],['thermal-contact',{...td,dt:75,c1:140},t],['radiative-balance',rd,r],['radiative-balance',{...rd,epsilon:.4,cosine:.1},r],['mass-distribution',id,i],['mass-distribution',{...id,offset:.25,fraction:.5},i]]){
 const file='test-results/reference-input.json';writeFileSync(file,JSON.stringify({format:'orbital-worked-example',version:1,case:name,parameters}));
 const py=JSON.parse(execFileSync(process.env.PYTHON||(process.platform==='win32'?'python':'python3'),['public/repro/physics_reference.py',file],{encoding:'utf8'})),js=run(parameters);
 if(name==='thermal-contact'){close(py.finalExact.t1,js.finalExact.t1);close(py.finalNumerical.t1,js.finalNumerical.t1);close(py.finalNumerical.energyResidual,js.finalNumerical.energyResidual,1e-7);}else if(name==='radiative-balance')close(py.temperature,js.temperature);else py.models.forEach((m,n)=>close(m.iy,js.models[n].iy));
}
const examples=JSON.parse(readFileSync('research/worked-examples-v11.json','utf8'));
for(const entry of examples.cases){assert.ok(entry.sources.length>=2&&entry.derivation.length>=3);assert.ok(entry.scope&&entry.units&&entry.dataIdentity);}
const catalogKeys={lessonIds:'learning',resourceIds:'library',vehicleIds:'vehicles',dossierIds:'research-dossiers-v10'};
for(const ex of loadTypeScript('src/workedExampleIndex.ts').workedExamples)for(const [key,file]of Object.entries(catalogKeys)){const raw=JSON.parse(readFileSync(`research/${file}.json`,'utf8')),catalog=Array.isArray(raw)?raw:raw.dossiers;for(const ref of ex[key])assert.ok(catalog.some(c=>c.id===ref),`${ex.id}: missing ${key} ${ref}`);}
// Public privacy regression: both repository datasets and generated bundles are checked.
const files=readdirSync('research').filter(f=>f.startsWith('project-')&&f.endsWith('.json')).map(f=>'research/'+f);
if(process.argv.includes('--dist'))files.push(...readdirSync('dist/assets').filter(f=>f.endsWith('.js')).map(f=>'dist/assets/'+f));
for(const file of files){const text=readFileSync(file,'utf8');assert.ok(!/AerospaceSimUE[\\/]|[CD]:[\\/]|"localPath"|"sourceLocations"/.test(text),`${file}: private source location`);if(file.startsWith('research/')){const walk=v=>{if(v&&typeof v==='object'){for(const [k,x]of Object.entries(v)){assert.ok(!['path','localPath','sourceLocations','privateLocators'].includes(k),`${file}: private location field ${k}`);walk(x);}}};walk(JSON.parse(text));}}
console.log('PASS: analytical limits, Euler stability and convergence, energy conservation, radiation scaling, inertia/axis checks, invalid input rejection, seven Python cross-checks, catalog references and public project privacy.');
