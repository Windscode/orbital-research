import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadTypeScript} from './load-typescript.mjs';
const {airfoilY,pressurePanel,integratePressure,validateAeroDataset,samplingStrides}=loadTypeScript('src/aeroPressure.ts');
const {modalStaticReference}=loadTypeScript('src/structuralReference.ts');
const {combineApollo,apolloSeparation,LB_KG,SLUG_FT2_KGM2}=loadTypeScript('src/apolloMass.ts');
const near=(actual,expected,tol=2e-12)=>assert.ok(Math.abs(actual-expected)<=tol,`${actual} != ${expected} within ${tol}`);
const root=path.resolve('public/data/naca0012'),data=validateAeroDataset(JSON.parse(await readFile(path.join(root,'naca0012.json'),'utf8')));
const manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'));
for(const f of manifest.files){const bytes=await readFile(path.resolve(root,f.file));assert.equal(bytes.length,f.bytes,f.file);assert.equal(createHash('sha256').update(bytes).digest('hex'),f.sha256,f.file);}
const raw=await readFile(path.join(root,'n0012cp_cfl3d_sa.dat'),'utf8');
const zones=raw.split(/zone, t="alpha=/).slice(1).map(s=>s.split(/\r?\n/).slice(1).filter(l=>/^\s*[-.0-9]/.test(l)).map(l=>l.trim().split(/\s+/).map(Number)));
assert.equal(zones.length,3);
for(const [j,c] of data.cases.entries()){
 assert.equal(zones[j].length,513);
 for(const [i,p] of c.points.entries()){near(p.x,zones[j][i][0],0);near(p.cp,zones[j][i][1],0);near(p.y,(i<256?-1:1)*airfoilY(p.x));}
 const full=integratePressure(c.points,c.alpha_deg);
 for(const [key,ref] of [['ca','CAp'],['cn','CNp'],['cl','CLp'],['cd','CDp']])near(full[key],c.reference[ref]);
 const constant=integratePressure(c.points.map(p=>({...p,cp:2.7})),c.alpha_deg);near(constant.cl,0);near(constant.cd,0);
 const offset=integratePressure(c.points.map(p=>({...p,cp:p.cp+3})),c.alpha_deg);near(offset.cl,full.cl);near(offset.cd,full.cd);
 const reverse=integratePressure([...c.points].reverse(),c.alpha_deg);near(reverse.cl,-full.cl);near(reverse.cd,-full.cd);
 for(const stride of samplingStrides){const result=integratePressure(c.points,c.alpha_deg,stride);assert.equal(result.retained.length,512/stride+1);assert.ok(result.retained.some(p=>p.index===256));assert.equal(result.retained[0].index,0);assert.equal(result.retained.at(-1).index,512);near(result.panels.reduce((sum,p)=>sum+p.cl,0),result.cl);}
}
const c10=data.cases[1],p297=pressurePanel(c10.points[297],c10.points[298],10);near(p297.cl,.001757454584321,1e-14);near(p297.cd,-.001935697884782,1e-14);
const shuffled=structuredClone(data);[shuffled.cases[0].points[0],shuffled.cases[0].points[1]]=[shuffled.cases[0].points[1],shuffled.cases[0].points[0]];assert.throws(()=>validateAeroDataset(shuffled));
const corrupt=structuredClone(data);corrupt.cases[0].points[50].y+=.001;assert.throws(()=>validateAeroDataset(corrupt));assert.throws(()=>integratePressure(c10.points,10,3));
const temp=await mkdtemp(path.join(tmpdir(),'orbital-aero-v13-'));
try{
 execFileSync(process.platform==='win32'?'python':'python3',['public/repro/naca0012_reference.py',root,'--json',path.join(temp,'reference.json')],{encoding:'utf8'});
 const independent=JSON.parse(await readFile(path.join(temp,'reference.json'),'utf8'));assert.equal(independent.length,21);
 for(const r of independent){const c=data.cases.find(c=>c.alpha_deg===r.alpha_deg),got=integratePressure(c.points,c.alpha_deg,r.stride);near(got.cl,r.CLp);near(got.cd,r.CDp);}
}finally{const resolved=path.resolve(temp);assert.ok(resolved.startsWith(path.resolve(tmpdir())+path.sep)&&path.basename(resolved).startsWith('orbital-aero-v13-'));await rm(resolved,{recursive:true,force:true});}
for(const force of [[1,0],[1,1],[1,-1]]){
 const full=modalStaticReference(force,2);near(full.u1,(200*force[0]+100*force[1])/30000);near(full.u2,(100*force[0]+200*force[1])/30000);full.residual.forEach(n=>near(n,0));
}
near(modalStaticReference([1,0],1).middleForce,0);near(modalStaticReference([1,0],2).middleForce,1/3);near(modalStaticReference([1,1],1).u1,.01);near(modalStaticReference([1,-1],1).u1,0);
const apollo=combineApollo(),bad=combineApollo(false);near(apollo.mass,apolloSeparation.before.massLb*LB_KG,1e-9);near(apollo.cg[0],24.425685357717626);[20886.622609697668,67399.7440389185,69567.79791106551].forEach((n,k)=>near(apollo.inertia[k],n,1e-8));assert.ok(bad.inertia[1]<.5*apolloSeparation.before.inertia[1]*SLUG_FT2_KGM2);
console.log('PASS v13: frozen-file hashes, 1539 original pressure rows, contour signs and invariants, 21 independent Python comparisons, malformed data, two-DOF modal counterexample and Apollo mass/inertia reconstruction.');
