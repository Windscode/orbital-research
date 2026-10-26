import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadTypeScript} from './load-typescript.mjs';
const {EARTH_MU:mu,EARTH_RADIUS:R,orbitElements}=loadTypeScript('src/orbit.ts');
const {defaultMission:c,DEG,EARTH_ROTATION,missionState,rotatePerifocal,earthFixed,subSatellite,groundTrack,hohmannTransfer,j2Rates,degPerDay,sunSynchronousInclination,missionReport,validateMission}=loadTypeScript('src/orbitMission.ts');
const reference=JSON.parse(readFileSync('research/orbital-lab-v9.json','utf8'));
const expected=id=>reference.benchmarks.find(b=>b.id===id).expected;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log(`PASS: ${name}`);};
const close=(a,b,tol=1e-9)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=tol,`${a} != ${b}; tolerance ${tol}`);
const vector=(a,b,tol=1e-9)=>a.forEach((v,i)=>close(v,b[i],tol));
test('independent circular reference and geometric rotation signs',()=>{
 const b=expected('circular-400km'),s=missionState(c,0);close(s.radius,b.radiusKm);close(s.speed,b.speedKmPerSecond);close(orbitElements(400,400).period,b.periodSeconds);
 vector(rotatePerifocal([1,0,0],{inclination:0,raan:0,argPerigee:0}),[1,0,0]);
 vector(rotatePerifocal([1,0,0],{inclination:0,raan:90,argPerigee:0}),[0,1,0]);
 vector(rotatePerifocal([1,0,0],{inclination:90,raan:0,argPerigee:90}),[0,0,1]);
 close(subSatellite([1,0,0],Math.PI/2/EARTH_ROTATION).longitude,-90);
 vector(earthFixed([1,0,2],Math.PI/2/EARTH_ROTATION),[0,-1,2]);
});
test('rotated elliptic states conserve energy and angular momentum; velocity is a position derivative',()=>{
 for(const orbit of [{...c,apogee:80000,inclination:120,raan:217,argPerigee:272,meanAnomaly:48},{...c,perigee:600,apogee:39700,inclination:63.4349488,argPerigee:270},{...c,inclination:180}]){
  const o=orbitElements(orbit.perigee,orbit.apogee),h=Math.sqrt(mu*o.a*(1-o.e**2));
  for(let j=0;j<=36;j++){
   const t=o.period*j/12,s=missionState(orbit,t),r=s.position,v=s.velocity;
   close(s.speed*s.speed/2-mu/s.radius,-mu/(2*o.a),1e-10);
   close(Math.hypot(r[1]*v[2]-r[2]*v[1],r[2]*v[0]-r[0]*v[2],r[0]*v[1]-r[1]*v[0]),h,1e-7);
   const before=missionState(orbit,t-.01),after=missionState(orbit,t+.01);
   vector(after.position.map((x,i)=>(x-before.position[i])/.02),v,2e-7);
   assert.ok(s.radius>=o.rp-1e-8&&s.radius<=o.ra+1e-8);
  }
  vector(missionState(orbit,0).position,missionState(orbit,o.period).position,1e-7);
 }
});
test('synchronous ground point remains stationary and retrograde latitude bound is correct',()=>{
 const b=expected('synchronous-radius'),geo={...c,perigee:b.altitudeKm,apogee:b.altitudeKm,inclination:0,raan:73,meanAnomaly:19};
 for(let i=0;i<20;i++){const p=subSatellite(missionState(geo,i*b.periodSeconds/7).position,i*b.periodSeconds/7);close(p.latitude,0);close(p.longitude,92,1e-9);}
 const retro={...c,inclination:120,raan:0,meanAnomaly:90};close(subSatellite(missionState(retro,0).position,0).latitude,60);
 const heo={...c,perigee:600,apogee:39700,inclination:63.43495,argPerigee:270,meanAnomaly:180};close(subSatellite(missionState(heo,0).position,0).latitude,heo.inclination);
});
test('ground tracks retain all time samples and never draw across the longitude seam',()=>{
 const tracks=groundTrack({...c,raan:170},3*orbitElements(c.perigee,c.apogee).period),points=tracks.flat();assert.equal(points.length,721);assert.ok(tracks.length>1);
 tracks.forEach(segment=>segment.forEach((p,i)=>{assert.ok(Math.abs(p.longitude)<=180&&Math.abs(p.latitude)<=90);if(i)assert.ok(Math.abs(p.longitude-segment[i-1].longitude)<=180);}));
 points.forEach((p,i)=>{if(i)assert.ok(p.time>points[i-1].time);});
});
test('Hohmann benchmarks, vector plane change, zero transfer and monotonic strategy costs',()=>{
 const b=expected('hohmann-400-to-35786'),t=hohmannTransfer(400,35786,0);close(t.departure,b.deltaV1KmPerSecond);close(t.arrival,b.deltaV2KmPerSecond);close(t.coastTime,b.transferSeconds,1e-6);close(t.combinedTotal,b.totalDeltaVKmPerSecond);
 const p=expected('plane-change-28-5deg'),s=hohmannTransfer(400,35786,28.5);close(s.combined,p.combinedCircularizationPlaneChangeKmPerSecond);close(s.lowPlane,p.purePlaneChangeAtInitialKmPerSecond);
 for(const angle of [0,.000001,28.5,90,180]){const q=hohmannTransfer(400,35786,angle);assert.ok(q.combinedTotal<=q.highPlaneTotal+1e-9);assert.ok(q.highPlaneTotal<=q.lowPlaneTotal+1e-9);}
 close(hohmannTransfer(400,400,0).combinedTotal,0);close(hohmannTransfer(400,400,20).combined,2*Math.sqrt(mu/(R+400))*Math.sin(10*DEG));
});
test('J2 benchmark, polar and critical inclination, supplementary-plane symmetry',()=>{
 const b=expected('j2-400km-51-6deg'),r=j2Rates(c);close(degPerDay(r.node),b.raanRateDegPerDay);close(degPerDay(r.periapsis),b.formalArgumentPerigeeRateDegPerDay);
 close(j2Rates({...c,inclination:90}).node,0,1e-20);close(j2Rates({...c,inclination:Math.acos(1/Math.sqrt(5))/DEG}).periapsis,0,1e-20);
 close(j2Rates({...c,inclination:180-c.inclination}).node,-r.node,1e-20);
});
test('solar-synchronous inclination solves the target drift, and impossible cases return null',()=>{
 const i=sunSynchronousInclination(700,700);close(i,expected('sso-700km').inclinationDeg);close(degPerDay(j2Rates({...c,perigee:700,apogee:700,inclination:i}).node),360/365.2422);
 assert.equal(sunSynchronousInclination(35786,35786),null);
});
test('invalid bounds and non-finite inputs are rejected before propagation',()=>{
 for(const patch of [{perigee:199},{apogee:399},{apogee:80001},{inclination:-1},{inclination:181},{raan:NaN},{argPerigee:Infinity}])assert.throws(()=>validateMission({...c,...patch}),RangeError);
 assert.throws(()=>missionState(c,Infinity),RangeError);assert.throws(()=>groundTrack(c,0),RangeError);assert.throws(()=>groundTrack(c,100,1),RangeError);assert.throws(()=>hohmannTransfer(800,400,0),RangeError);assert.throws(()=>sunSynchronousInclination(800,400),RangeError);
});
test('export preserves frame, units, inputs and corresponding state at selected time',()=>{
 const report=JSON.parse(JSON.stringify(missionReport(c,1000)));assert.equal(report.units.length,'km');assert.match(report.frame,/not UTC\/J2000/);assert.deepEqual(report.config,c);vector(report.state.position,missionState(c,1000).position);close(report.subSatellite.longitude,subSatellite(report.state.position,1000).longitude);
});
console.log(`Validated ${checks} orbital mission groups against independent scalar and geometric references.`);
