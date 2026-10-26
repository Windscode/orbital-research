import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {loadTypeScript} from './load-typescript.mjs';
const {initialModelView,partVisible,updateSectionPlane,orthographicFrame,directionalCameraFrame,viewDirections}=loadTypeScript('src/modelView.ts');
const {buildVehicleModel}=loadTypeScript('src/modelGeometry.ts');
const vehicles=JSON.parse(await readFile('research/vehicles.json','utf8'));
const profiles=JSON.parse(await readFile('research/model-research-v8.json','utf8'));
assert.equal(profiles.length,vehicles.length);assert.equal(new Set(profiles.map(x=>x.id)).size,vehicles.length);
let projections=0,features=0;
for(const vehicle of vehicles){
 const review=profiles.find(x=>x.id===vehicle.id);assert(review,vehicle.id);assert.equal(vehicle.model.review.configuration,review.configuration);
 const exported=JSON.parse(await readFile(`public/models/${vehicle.id}.json`,'utf8'));
 assert.equal(exported.vehicleId,vehicle.id);assert.equal(exported.physicalScaleKnown,false);
 assert.deepEqual(exported.review,review,`${vehicle.id}: exported research record is stale`);
 assert.deepEqual(exported.parts,vehicle.model.parts,`${vehicle.id}: exported parts are stale`);
 const preview=await readFile(`public/models/${vehicle.id}.webp`);
 assert.equal(preview.toString('ascii',0,4),'RIFF');assert.equal(preview.toString('ascii',8,12),'WEBP');assert(preview.length>1024,`${vehicle.id}: empty preview`);
 assert(review.features.length>=3);assert(review.uncertainties.length>=2);assert(review.changes.length);assert(review.sources.length);
 for(const f of review.features){assert(vehicle.model.parts.some(p=>p.id===f.partId),`${vehicle.id}/${f.partId}`);assert.equal(new URL(f.sourceUrl).protocol,'https:');assert(f.detail.trim().length,`${vehicle.id}: missing feature explanation`);features++;}
 const built=buildVehicleModel(vehicle,new THREE.Plane());
 try{
  for(const explosion of [0,1.25,2.5]){
   for(const p of built.parts)p.group.position.copy(p.base).addScaledVector(p.direction,explosion);
   for(const object of [built.root,...built.parts.map(p=>p.group)]){
    const bounds=new THREE.Box3().setFromObject(object);
    for(const aspect of [.45,1,2.5])for(const dir of Object.values(viewDirections)){
     const direction=new THREE.Vector3(...dir),f=orthographicFrame(bounds,aspect,direction);
     const camera=new THREE.OrthographicCamera(-f.halfWidth,f.halfWidth,f.halfHeight,-f.halfHeight,.01,500);camera.position.copy(f.position);if(direction.y===1)camera.up.set(0,0,-1);camera.lookAt(f.center);camera.updateMatrixWorld(true);
     for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const p=new THREE.Vector3(x,y,z).project(camera);assert(Math.abs(p.x)<1&&Math.abs(p.y)<1&&Math.abs(p.z)<1,`${vehicle.id}: orthographic clipping`);projections++;}
     const pf=directionalCameraFrame(bounds,aspect,35,direction),pc=new THREE.PerspectiveCamera(35,aspect,.01,500);pc.position.copy(pf.center).addScaledVector(direction.clone().normalize(),pf.distance);if(direction.y===1)pc.up.set(0,0,-1);pc.lookAt(pf.center);pc.updateMatrixWorld(true);
     for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const p=new THREE.Vector3(x,y,z).project(pc);assert(Math.abs(p.x)<1&&Math.abs(p.y)<1&&Math.abs(p.z)<1,`${vehicle.id}: perspective clipping`);projections++;}
    }
   }
  }
  const all=new Set(built.parts.map(p=>p.id));
  for(const part of vehicle.model.parts){assert(all.has(part.id));assert(partVisible(part.id,initialModelView));assert(!partVisible(part.id,{...initialModelView,hidden:[part.id]}));}
  const first=built.parts[0].id;assert(partVisible(first,{...initialModelView,selected:first,isolated:true}));for(const p of built.parts.slice(1))assert(!partVisible(p.id,{...initialModelView,selected:first,isolated:true}));
  assert(!partVisible(first,{...initialModelView,selected:first,isolated:true,hidden:[first]}));
  for(const mesh of built.meshes)assert(['internal','shell','equipment'].includes(mesh.userData.layer));
 }finally{built.meshes.forEach(m=>m.geometry.dispose());built.materials.forEach(m=>m.dispose());}
}
const bounds=new THREE.Box3(new THREE.Vector3(-7,-2,10),new THREE.Vector3(5,8,30));
for(const axis of ['x','y','z'])for(const fraction of [-1,0,1])for(const flipped of [false,true]){
 const plane=updateSectionPlane(new THREE.Plane(),bounds,axis,fraction,flipped),center=bounds.getCenter(new THREE.Vector3());
 const at=center.clone();at[axis]=(bounds.min[axis]+bounds.max[axis])/2+fraction*(bounds.max[axis]-bounds.min[axis])/2;
 assert(Math.abs(plane.distanceToPoint(at))<1e-12);const higher=at.clone();higher[axis]+=1;assert.equal(Math.sign(plane.distanceToPoint(higher)),flipped?1:-1);
}
console.log(`PASS: ${vehicles.length} model research records, ${features} linked configuration features; ${projections} directional/orthographic corner projections; section axes/directions, hidden and isolated selections.`);
