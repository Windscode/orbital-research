import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import ts from 'typescript';
import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'public','models');await mkdir(out,{recursive:true});
// The exporter only needs Blob -> ArrayBuffer here; no images or browser API.
globalThis.FileReader=class{result=null;onloadend=null;onerror=null;readAsArrayBuffer(blob){blob.arrayBuffer().then(b=>{this.result=b;this.onloadend?.({target:this});}).catch(e=>this.onerror?.(e));}readAsDataURL(blob){blob.arrayBuffer().then(b=>{this.result=`data:${blob.type};base64,${Buffer.from(b).toString('base64')}`;this.onloadend?.({target:this});});}};
const source=await readFile(path.join(root,'src','modelGeometry.ts'),'utf8');
const generated=path.join(root,'scripts','.model-geometry-build.mjs');
await writeFile(generated,ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
try{
 const {buildVehicleModel}=await import(pathToFileURL(generated).href);
 const vehicles=JSON.parse(await readFile(path.join(root,'research','vehicles.json'),'utf8'));
 const exporter=new GLTFExporter(),index=[];
 for(const v of vehicles){if(!v.model)continue;const built=buildVehicleModel(v,new THREE.Plane(new THREE.Vector3(-1,0,0),0));
  built.root.name=v.name;built.root.userData={vehicleId:v.id,classification:'PARAMETRIC EDUCATIONAL SCHEMATIC; NOT ENGINEERING CAD',units:'normalized illustration units; not metres',disclaimer:v.model.disclaimer,provenance:v.sources,modelMetadata:v.model};
  for(const m of built.meshes){const pos=m.geometry.getAttribute('position');for(let i=0;i<pos.count;i++){if(!Number.isFinite(pos.getX(i)+pos.getY(i)+pos.getZ(i)))throw Error(`${v.id}: non-finite mesh geometry`);}if(!Number.isFinite(m.position.lengthSq()))throw Error(`${v.id}: non-finite placement`);}
  const result=await exporter.parseAsync(built.root,{binary:true,onlyVisible:false});if(!(result instanceof ArrayBuffer))throw Error('Expected GLB');
  const bytes=Buffer.from(result);if(bytes.readUInt32LE(0)!==0x46546c67)throw Error('Invalid GLB magic');
  await writeFile(path.join(out,`${v.id}.glb`),bytes);index.push({id:v.id,name:v.name,kind:v.model.kind,file:`/models/${v.id}.glb`,bytes:bytes.length,groups:built.parts.map(p=>p.id),sources:v.sources,classification:'研究示意模型，非制造CAD'});
  built.meshes.forEach(m=>m.geometry.dispose());built.materials.forEach(m=>m.dispose());
 }
 await writeFile(path.join(out,'index.json'),JSON.stringify({generatedOn:'2026-10-25',count:index.length,models:index},null,2));
 console.log(`Exported and checked ${index.length} GLB files (${(index.reduce((s,m)=>s+m.bytes,0)/1024/1024).toFixed(1)} MiB).`);
}finally{await rm(generated,{force:true});}
