import {useEffect,useRef,useState,type RefObject} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {buildVehicleModel} from './modelGeometry';
import {directionalCameraFrame,orthographicFrame,partVisible,updateSectionPlane,viewDirections,type ModelViewState,type ViewPreset} from './modelView';
import type {Vehicle} from './types';

export function useVehicleScene(host:RefObject<HTMLDivElement|null>,vehicle:Vehicle,view:ModelViewState,onSelect:(id:string)=>void){
  const state=useRef(view),select=useRef(onSelect),dirty=useRef(true);
  state.current=view;select.current=onSelect;
  const [status,setStatus]=useState({ready:false,error:'',parts:[] as string[],triangles:0});
  const api=useRef({fit:()=>{},preset:(_preset:ViewPreset)=>{},projection:(_ortho:boolean)=>{},snapshot:()=>{}});
  useEffect(()=>{dirty.current=true;},[view]);
  useEffect(()=>{
    const el=host.current;if(!el||!vehicle.model)return;
    setStatus({ready:false,error:'',parts:[],triangles:0});let renderer:THREE.WebGLRenderer;
    try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}
    catch{setStatus({ready:false,error:'浏览器未提供 WebGL。部件资料和模型下载仍可使用。',parts:vehicle.model.parts.map(p=>p.id),triangles:0});return;}
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.localClippingEnabled=true;
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
    renderer.domElement.setAttribute('aria-label',`${vehicle.name}三维结构示意`);renderer.domElement.setAttribute('role','img');el.appendChild(renderer.domElement);
    const scene=new THREE.Scene();scene.background=new THREE.Color('#0b1729');
    const perspective=new THREE.PerspectiveCamera(35,1,.01,500),orthographic=new THREE.OrthographicCamera(-5,5,5,-5,.01,500);
    let camera:THREE.PerspectiveCamera|THREE.OrthographicCamera=perspective;
    const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.1;controls.autoRotateSpeed=.5;controls.minDistance=.1;controls.maxDistance=100;controls.minZoom=.15;controls.maxZoom=20;
    scene.add(new THREE.HemisphereLight('#dce9ff','#20304a',2));
    const key=new THREE.DirectionalLight('#fff1d9',3.2);key.position.set(5,8,10);scene.add(key);
    const rim=new THREE.DirectionalLight('#81abff',3);rim.position.set(-7,3,-5);scene.add(rim);
    const fill=new THREE.DirectionalLight('#ebf3ff',1.2);fill.position.set(2,-3,5);scene.add(fill);
    const plane=new THREE.Plane(new THREE.Vector3(-1,0,0),0),built=buildVehicleModel(vehicle,plane);scene.add(built.root);
    const baseBounds=new THREE.Box3().setFromObject(built.root),span=baseBounds.getSize(new THREE.Vector3()).length();
    const grid=new THREE.GridHelper(Math.max(10,span*2.5),40,'#32445c','#1b2c42');grid.position.y=baseBounds.min.y-.12;scene.add(grid);
    const edgePairs:{line:THREE.LineSegments;mesh:THREE.Mesh}[]=[];
    for(const mesh of built.meshes){
      const geometry=new THREE.EdgesGeometry(mesh.geometry,28);
      if(geometry.getAttribute('position').count===0){geometry.dispose();continue;}
      const line=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:'#a5bbd3',transparent:true,opacity:.2,depthWrite:false}));
      line.userData.decorative=true;mesh.add(line);edgePairs.push({line,mesh});
    }
    let aspect=1,lastExplode=-1,lastStyle='',lastHidden='',lastIsolated=false,alive=true,frame=0;
    const applyPositions=()=>{for(const part of built.parts){part.group.position.copy(part.base).addScaledVector(part.direction,state.current.explode);part.group.visible=partVisible(part.id,state.current);}built.root.updateMatrixWorld(true);};
    const visibleBounds=()=>{applyPositions();const bounds=new THREE.Box3();for(const part of built.parts)if(part.group.visible)bounds.union(new THREE.Box3().setFromObject(part.group));return bounds.isEmpty()?baseBounds:bounds;};
    const fit=(direction=camera.position.clone().sub(controls.target),target?:string)=>{
      if(direction.lengthSq()<.001)direction.set(...viewDirections.iso);
      const part=target?built.parts.find(p=>p.id===target):null;
      const bounds=part?new THREE.Box3().setFromObject(part.group):visibleBounds();
      camera.up.set(0,1,0);if(Math.abs(direction.clone().normalize().y)>.999)camera.up.set(0,0,-1);
      if(camera===orthographic){const f=orthographicFrame(bounds,aspect,direction);orthographic.left=-f.halfWidth;orthographic.right=f.halfWidth;orthographic.top=f.halfHeight;orthographic.bottom=-f.halfHeight;orthographic.zoom=1;orthographic.position.copy(f.position);controls.target.copy(f.center);}
      else{const f=directionalCameraFrame(bounds,aspect,perspective.fov,direction);perspective.position.copy(f.center).addScaledVector(direction.normalize(),f.distance);controls.target.copy(f.center);}
      camera.far=Math.max(500,span*30);camera.updateProjectionMatrix();controls.update();dirty.current=true;
    };
    const currentTarget=()=>state.current.isolated?state.current.selected:undefined;
    api.current={
      fit:()=>fit(undefined,currentTarget()),
      preset:preset=>fit(new THREE.Vector3(...viewDirections[preset]),currentTarget()),
      projection:ortho=>{const direction=camera.position.clone().sub(controls.target);camera=ortho?orthographic:perspective;controls.object=camera;fit(direction,currentTarget());},
      snapshot:()=>{renderer.render(scene,camera);renderer.domElement.toBlob(blob=>{if(!blob||!alive)return;const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`${vehicle.id}-research-view.png`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},'image/png');},
    };
    const resize=()=>{const width=el.clientWidth,height=el.clientHeight;if(!width||!height)return;renderer.setSize(width,height,false);aspect=width/height;perspective.aspect=aspect;fit(undefined,currentTarget());};
    const observer=new ResizeObserver(resize);observer.observe(el);fit(new THREE.Vector3(...viewDirections.iso));resize();
    const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down:[number,number]|null=null;
    const pointerDown=(event:PointerEvent)=>{if(event.button===0)down=[event.clientX,event.clientY];};
    const pointerUp=(event:PointerEvent)=>{
      if(!down||event.button!==0)return;const distance=Math.hypot(event.clientX-down[0],event.clientY-down[1]);down=null;if(distance>5)return;
      const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
      const hit=raycaster.intersectObjects(built.meshes,false).find(hit=>{
        for(let node:THREE.Object3D|null=hit.object;node;node=node.parent)if(!node.visible)return false;
        const material=(hit.object as THREE.Mesh).material as THREE.MeshStandardMaterial;
        return (!material.clippingPlanes?.length||plane.distanceToPoint(hit.point)>=0)&&material.opacity>=.1;
      });if(hit)select.current(hit.object.userData.partId);
    };
    const lost=(event:Event)=>{event.preventDefault();setStatus(s=>({...s,error:'三维图形上下文已中断，请关闭后重新打开模型。'}));};
    renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointerup',pointerUp);renderer.domElement.addEventListener('webglcontextlost',lost);
    const animate=()=>{
      if(!alive)return;frame=requestAnimationFrame(animate);if(document.hidden)return;
      const s=state.current;controls.autoRotate=s.rotate;
      if(dirty.current){
        applyPositions();const bounds=visibleBounds();updateSectionPlane(plane,bounds,s.axis,s.section,s.flipped);
        if(lastExplode!==s.explode){fit(undefined,currentTarget());lastExplode=s.explode;}
        const hiddenKey=`${s.isolated}/${s.selected}/${s.hidden.join(',')}`;
        if(hiddenKey!==lastHidden&&(s.isolated||lastIsolated)){fit(undefined,currentTarget());}lastHidden=hiddenKey;lastIsolated=s.isolated;
        const style=`${s.mode}/${s.edges}/${s.selected}`;
        if(style!==lastStyle){
          for(const mesh of built.meshes){
            const material=mesh.material as THREE.MeshStandardMaterial,external=!!material.userData.external;
            mesh.visible=s.mode!=='internal'||!external;
            material.clippingPlanes=s.mode==='cutaway'?[plane]:[];material.transparent=s.mode==='xray'&&external;material.opacity=material.transparent?.16:1;material.depthWrite=!material.transparent;material.wireframe=s.mode==='wire';
            material.emissive.set(mesh.userData.partId===s.selected?'#3b72b8':'#000000');material.emissiveIntensity=.42;material.needsUpdate=true;
          }
          for(const {line,mesh} of edgePairs){const material=line.material as THREE.LineBasicMaterial;line.visible=s.edges&&s.mode!=='wire'&&!(s.mode==='xray'&&(mesh.material as THREE.MeshStandardMaterial).userData.external);material.clippingPlanes=s.mode==='cutaway'?[plane]:[];material.opacity=mesh.userData.partId===s.selected?.6:.19;material.needsUpdate=true;}lastStyle=style;
        }
        grid.visible=s.grid;
      }
      const moved=controls.update();if(dirty.current||moved||s.rotate){renderer.render(scene,camera);dirty.current=false;}
    };
    const changed=()=>{dirty.current=true;};controls.addEventListener('change',changed);
    setStatus({ready:true,error:'',parts:built.parts.map(p=>p.id),triangles:built.meshes.reduce((sum,m)=>sum+(m.geometry.index?.count||m.geometry.getAttribute('position').count)/3,0)});frame=requestAnimationFrame(animate);
    return()=>{
      alive=false;cancelAnimationFrame(frame);observer.disconnect();controls.removeEventListener('change',changed);controls.dispose();
      renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointerup',pointerUp);renderer.domElement.removeEventListener('webglcontextlost',lost);
      for(const {line} of edgePairs){line.geometry.dispose();(line.material as THREE.Material).dispose();}
      built.meshes.forEach(m=>m.geometry.dispose());built.materials.forEach(m=>m.dispose());grid.geometry.dispose();(grid.material as THREE.Material).dispose();renderer.dispose();renderer.domElement.remove();
    };
  },[vehicle,host]);
  return {...status,api};
}
