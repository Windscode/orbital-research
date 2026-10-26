import * as THREE from 'three';

export type ModelMode='solid'|'cutaway'|'xray'|'internal'|'wire';
export type ViewPreset='iso'|'front'|'right'|'top'|'rear';
export type SectionAxis='x'|'y'|'z';
export interface ModelViewState {
  mode:ModelMode; explode:number; section:number; axis:SectionAxis; flipped:boolean;
  selected:string; isolated:boolean; hidden:string[]; rotate:boolean; edges:boolean; grid:boolean;
}
export const initialModelView:ModelViewState={mode:'solid',explode:0,section:0,axis:'x',flipped:false,selected:'',isolated:false,hidden:[],rotate:false,edges:true,grid:true};
export const viewDirections:Record<ViewPreset,[number,number,number]>={iso:[.95,.48,2],front:[0,0,1],right:[1,0,0],top:[0,1,0],rear:[0,0,-1]};
export function partVisible(id:string,state:ModelViewState){return !state.hidden.includes(id)&&(!state.isolated||!state.selected||id===state.selected);}
/** Centre the section on the current exploded model, not the old assembly origin. */
export function updateSectionPlane(plane:THREE.Plane,bounds:THREE.Box3,axis:SectionAxis,fraction:number,flipped:boolean){
  const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
  const sign=flipped?1:-1;plane.normal.set(axis==='x'?sign:0,axis==='y'?sign:0,axis==='z'?sign:0);
  const point=center.clone();point[axis]+=Math.max(-1,Math.min(1,fraction))*size[axis]/2;
  plane.constant=-plane.normal.dot(point);return plane;
}
export function orthographicFrame(bounds:THREE.Box3,aspect:number,direction:THREE.Vector3){
  const center=bounds.getCenter(new THREE.Vector3()),radius=Math.max(.1,bounds.getBoundingSphere(new THREE.Sphere()).radius);
  const basis=viewBasis(direction);let width=.1,height=.1;
  for(const corner of boundsCorners(bounds)){corner.sub(center);width=Math.max(width,Math.abs(corner.dot(basis.right)));height=Math.max(height,Math.abs(corner.dot(basis.up)));}
  const halfHeight=Math.max(height,width/Math.max(.05,aspect))*1.12;
  return {center,position:center.clone().addScaledVector(direction.clone().normalize(),radius*4+1),halfHeight,halfWidth:halfHeight*Math.max(.05,aspect)};
}
function boundsCorners(bounds:THREE.Box3){const points:THREE.Vector3[]=[];for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])points.push(new THREE.Vector3(x,y,z));return points;}
function viewBasis(direction:THREE.Vector3){const forward=direction.clone().normalize(),upHint=Math.abs(forward.y)>.999?new THREE.Vector3(0,0,-1):new THREE.Vector3(0,1,0);const right=new THREE.Vector3().crossVectors(upHint,forward).normalize(),up=new THREE.Vector3().crossVectors(forward,right).normalize();return{forward,right,up};}
export function directionalCameraFrame(bounds:THREE.Box3,aspect:number,fov:number,direction:THREE.Vector3){
 const center=bounds.getCenter(new THREE.Vector3()),basis=viewBasis(direction),tanV=Math.tan(THREE.MathUtils.degToRad(fov)/2),tanH=tanV*Math.max(.05,aspect);let distance=.2;
 for(const corner of boundsCorners(bounds)){corner.sub(center);const depth=corner.dot(basis.forward);distance=Math.max(distance,Math.abs(corner.dot(basis.right))/tanH+depth,Math.abs(corner.dot(basis.up))/tanV+depth);}
 return {center,distance:distance*1.12};
}
