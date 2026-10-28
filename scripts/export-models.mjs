import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadTypeScript} from './load-typescript.mjs';
import {modelThumbnail} from './model-thumbnail.mjs';
import sharp from 'sharp';
import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'public','models');await mkdir(out,{recursive:true});
// The exporter only needs Blob -> ArrayBuffer here; no images or browser API.
globalThis.FileReader=class{result=null;onloadend=null;onerror=null;readAsArrayBuffer(blob){blob.arrayBuffer().then(b=>{this.result=b;this.onloadend?.({target:this});}).catch(e=>this.onerror?.(e));}readAsDataURL(blob){blob.arrayBuffer().then(b=>{this.result=`data:${blob.type};base64,${Buffer.from(b).toString('base64')}`;this.onloadend?.({target:this});});}};
{
 const {buildVehicleModel}=loadTypeScript(path.join(root,'src','modelGeometry.ts'));
 const vehicles=JSON.parse(await readFile(path.join(root,'research','vehicles.json'),'utf8'));
 const exporter=new GLTFExporter(),index=[];
 for(const v of vehicles){if(!v.model)continue;const built=buildVehicleModel(v,new THREE.Plane(new THREE.Vector3(-1,0,0),0));
  built.root.name=v.name;built.root.userData={vehicleId:v.id,classification:'PARAMETRIC EDUCATIONAL SCHEMATIC; NOT ENGINEERING CAD',units:'glTF metre units represent a normalized display object; not the spacecraft physical dimensions',physicalScaleKnown:false,disclaimer:v.model.disclaimer,provenance:[...v.sources,...(v.model.review?.sources||[])],modelMetadata:v.model};
  for(const m of built.meshes){const pos=m.geometry.getAttribute('position');for(let i=0;i<pos.count;i++){if(!Number.isFinite(pos.getX(i)+pos.getY(i)+pos.getZ(i)))throw Error(`${v.id}: non-finite mesh geometry`);}if(!Number.isFinite(m.position.lengthSq()))throw Error(`${v.id}: non-finite placement`);}
  const result=await exporter.parseAsync(built.root,{binary:true,onlyVisible:false});if(!(result instanceof ArrayBuffer))throw Error('Expected GLB');
  const bytes=Buffer.from(result);if(bytes.readUInt32LE(0)!==0x46546c67)throw Error('Invalid GLB magic');
  await writeFile(path.join(out,`${v.id}.glb`),bytes);
  await writeFile(path.join(out,`${v.id}.json`),JSON.stringify({vehicleId:v.id,name:v.name,classification:'研究示意模型，非制造CAD',physicalScaleKnown:false,review:v.model.review,parts:v.model.parts},null,2));
  await sharp(Buffer.from(modelThumbnail(built,v)),{density:144}).resize(800,640).webp({quality:88}).toFile(path.join(out,`${v.id}.webp`));
  index.push({id:v.id,name:v.name,kind:v.model.kind,file:`/models/${v.id}.glb`,preview:`/models/${v.id}.webp`,record:`/models/${v.id}.json`,bytes:bytes.length,groups:built.parts.map(p=>p.id),sources:v.sources,classification:'研究示意模型，非制造CAD'});
  built.meshes.forEach(m=>m.geometry.dispose());built.materials.forEach(m=>m.dispose());
 }
 await writeFile(path.join(out,'index.json'),JSON.stringify({generatedOn:'2026-10-29',count:index.length,models:index},null,2));
 console.log(`Exported and checked ${index.length} GLB files (${(index.reduce((s,m)=>s+m.bytes,0)/1024/1024).toFixed(1)} MiB).`);
}
