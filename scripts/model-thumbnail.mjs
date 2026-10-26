import * as THREE from 'three';
const xml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function previewGeometry(geometry){
 const p=geometry.parameters||{};
 if(geometry.type==='SphereGeometry')return new THREE.SphereGeometry(p.radius,16,12,p.phiStart,p.phiLength,p.thetaStart,p.thetaLength);
 if(geometry.type==='CylinderGeometry')return new THREE.CylinderGeometry(p.radiusTop,p.radiusBottom,p.height,Math.min(p.radialSegments,24),p.heightSegments,p.openEnded,p.thetaStart,p.thetaLength);
 if(geometry.type==='TorusGeometry')return new THREE.TorusGeometry(p.radius,p.tube,6,Math.min(p.tubularSegments,24),p.arc);
 if(geometry.type==='LatheGeometry')return new THREE.LatheGeometry(p.points,Math.min(p.segments,24),p.phiStart,p.phiLength);
 return geometry;
}
/** Static vector projection of the SAME geometry used in the interactive viewer. */
export function modelThumbnail(built,vehicle){
 built.root.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(built.root),center=bounds.getCenter(new THREE.Vector3());
 const camera=new THREE.OrthographicCamera(-1,1,1,-1,.01,500);camera.position.copy(center).add(new THREE.Vector3(.95,.48,2).normalize().multiplyScalar(60));camera.lookAt(center);camera.updateMatrixWorld(true);
 const points=[];for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])points.push(new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
 const viewBounds=new THREE.Box3().setFromPoints(points),size=viewBounds.getSize(new THREE.Vector3()),scale=Math.min(340/size.x,250/size.y),offset=viewBounds.getCenter(new THREE.Vector3());
 const light=new THREE.Vector3(.4,.7,1).normalize(),faces=[];
 for(const mesh of built.meshes){
  if(mesh.userData.layer==='internal')continue;
  const geometry=previewGeometry(mesh.geometry),p=geometry.getAttribute('position'),indices=geometry.index,matrix=camera.matrixWorldInverse.clone().multiply(mesh.matrixWorld);
  for(let i=0;i<(indices?.count||p.count);i+=3){
   const vertices=[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(p,indices?indices.getX(i+k):i+k).applyMatrix4(matrix));
   const normal=new THREE.Vector3().subVectors(vertices[1],vertices[0]).cross(new THREE.Vector3().subVectors(vertices[2],vertices[0]));
   if(normal.lengthSq()<1e-12)continue;normal.normalize();
   // Double-sided surfaces (solar blankets, dishes) remain visible; painter order
   // resolves front/back triangles and overlapping assembly shells.
   const brightness=.72+.28*Math.abs(normal.dot(light)),color=mesh.material.color.clone().multiplyScalar(brightness).lerp(new THREE.Color("#617994"),.07).getHexString();
   const path=vertices.map((v,k)=>`${k?'L':'M'}${(200+(v.x-offset.x)*scale).toFixed(1)},${(160-(v.y-offset.y)*scale).toFixed(1)}`).join('')+'Z';
   faces.push({z:vertices.reduce((sum,v)=>sum+v.z,0)/3,color,path});
  }
  if(geometry!==mesh.geometry)geometry.dispose();
 }
 faces.sort((a,b)=>a.z-b.z);let markup='',last='',paths='';
 const flush=()=>{if(paths)markup+=`<path fill="#${last}" d="${paths}"/>`;};
 for(const face of faces){if(face.color!==last){flush();last=face.color;paths='';}paths+=face.path;}flush();
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320" role="img"><title>${xml(vehicle.name)} · 构型研究模型</title><desc>与三维查看器同源的归一化简化构型；不是测量图或制造图纸。</desc><rect width="400" height="320" fill="#0b1729"/><g fill="none" stroke="#243b57" stroke-width=".5" opacity=".55"><path d="M24 276H376M200 30V290" stroke-dasharray="3 5"/><path d="M24 44V30H38M362 30H376V44M24 266V280H38M362 280H376V266"/></g>${markup}<text x="24" y="305" fill="#6c8daf" font-family="monospace" font-size="7">${xml(vehicle.id.toUpperCase())} / CONFIGURATION STUDY</text></svg>`;
}
