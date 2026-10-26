import * as THREE from 'three';
import type { Vehicle, VehicleModel } from './types';
import {buildRocketModel} from './rocketModels';
import {buildSpacecraftModel} from './spacecraftModels';
import {buildSurfaceModel} from './surfaceModels';

export interface PartGroup { id:string; group:THREE.Group; base:THREE.Vector3; direction:THREE.Vector3 }
export interface BuiltModel { root:THREE.Group; parts:PartGroup[]; meshes:THREE.Mesh[]; materials:THREE.MeshStandardMaterial[] }
const SILVER='#c4d0cf', DARK='#293b40', GOLD='#bfa26a', BLUE='#183e69', GREEN='#d3ef83';
export function cameraFrame(bounds:THREE.Box3,aspect:number,verticalFovDegrees:number){
  const sphere=bounds.getBoundingSphere(new THREE.Sphere());
  const halfVertical=THREE.MathUtils.degToRad(verticalFovDegrees)/2;
  const halfHorizontal=Math.atan(Math.tan(halfVertical)*Math.max(.05,aspect));
  return {center:sphere.center,distance:Math.max(.2,sphere.radius)/Math.sin(Math.min(halfVertical,halfHorizontal))*1.12};
}
/** Educational geometry, assembled from documented external configuration classes.
 * Dimensions of internal parts are visual placeholders, never engineering CAD. */
export function buildVehicleModel(vehicle:Vehicle, clip:THREE.Plane):BuiltModel {
  const model=vehicle.model!;
  const root=new THREE.Group(), parts:PartGroup[]=[], meshes:THREE.Mesh[]=[],materials:THREE.MeshStandardMaterial[]=[];
  const available=new Set(model.parts.map(p=>p.id));
  function group(id:string,direction:THREE.Vector3=new THREE.Vector3(0,1,0)) {
    const g=new THREE.Group();g.name=id;root.add(g);
    parts.push({id,group:g,base:g.position.clone(),direction});return g;
  }
  function material(color:string,external=false) {
    const mat=new THREE.MeshStandardMaterial({color,roughness:color===GOLD?.48:color===BLUE?.32:.58,metalness:color===GOLD?.72:color===SILVER?.52:.16,side:THREE.DoubleSide,clippingPlanes:[],emissive:'#000000'});
    mat.userData.external=external;mat.userData.original=new THREE.Color(color);materials.push(mat);return mat;
  }
  function mesh(g:THREE.Group,geo:THREE.BufferGeometry,color:string,pos:[number,number,number]=[0,0,0],external=false) {
    geo.normalizeNormals();const m=new THREE.Mesh(geo,material(color,external));m.position.set(...pos);m.userData.partId=g.name;m.userData.layer=external?'shell':['tank','avionics','crew','payload'].includes(g.name)?'internal':'equipment';g.add(m);meshes.push(m);return m;
  }
  function box(g:THREE.Group,s:[number,number,number],p:[number,number,number],color=DARK,external=false){return mesh(g,new THREE.BoxGeometry(...s),color,p,external);}
  function cylinder(g:THREE.Group,r:number,h:number,p:[number,number,number],color=SILVER,rt=r,external=false){return mesh(g,new THREE.CylinderGeometry(rt,r,h,48,1,false),color,p,external);}
  function sphere(g:THREE.Group,r:number,p:[number,number,number],color=SILVER,external=false){return mesh(g,new THREE.SphereGeometry(r,40,28),color,p,external);}
  function rod(g:THREE.Group,a:THREE.Vector3,b:THREE.Vector3,r=.025,color=SILVER){const v=b.clone().sub(a);const m=cylinder(g,r,v.length(),a.clone().add(b).multiplyScalar(.5).toArray() as [number,number,number],color);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return m;}
  function ring(g:THREE.Group,r:number,y:number,color=DARK){const m=mesh(g,new THREE.TorusGeometry(r,.023,8,48),color,[0,y,0]);m.rotation.x=Math.PI/2;return m;}
  function electronics(g:THREE.Group,y=0,count=6,r=.45){for(let i=0;i<count;i++){let a=i*Math.PI*2/count;box(g,[.23,.18,.2],[Math.cos(a)*r,y,Math.sin(a)*r],i%2?GOLD:GREEN);}}
  function engine(g:THREE.Group,r:number,y:number,x=0,z=0){const points=[[.28,0],[.22,-.18],[.20,-.3],[.25,-.5],[.38,-.8],[.6,-1.18],[.8,-1.48],[1,-1.7]].map(([a,b])=>new THREE.Vector2(r*a,r*b));mesh(g,new THREE.LatheGeometry(points,32),DARK,[x,y,z]);cylinder(g,r*.3,r*.3,[x,y+r*.1,z],GOLD);const lip=mesh(g,new THREE.TorusGeometry(r,r*.025,6,32),SILVER,[x,y-r*1.7,z]);lip.rotation.x=Math.PI/2;}
  function solar(g:THREE.Group,x:number,y:number,w:number,h:number,axis='x'){
    const panel=box(g,[w,.045,h],[x,y,0],BLUE,true);
    const back=box(g,[w,.01,h],[x,y-.029,0],SILVER,true);panel.attach(back);
    for(let i=0;i<=8;i++)panel.attach(box(g,[.011,.052,h],[x-w/2+w*i/8,y,0],'#547b97',true));
    for(let i=0;i<=4;i++)panel.attach(box(g,[w,.052,.009],[x,y,-h/2+h*i/4],'#547b97',true));
    panel.rotation.z=axis==='y'?Math.PI/2:0;
    return panel;
  }
  function antenna(g:THREE.Group,y:number,r=.65,x=0){const profile=[];for(let i=0;i<=16;i++){const t=i/16;profile.push(new THREE.Vector2(t*r,r*.37*t*t));}mesh(g,new THREE.LatheGeometry(profile,40),SILVER,[x,y,0],true);for(let i=0;i<3;i++){const a=i*Math.PI*2/3;rod(g,new THREE.Vector3(x+Math.cos(a)*r*.87,y+r*.28,Math.sin(a)*r*.87),new THREE.Vector3(x,y+r*.72,0),r*.012);}sphere(g,r*.07,[x,y+r*.74,0],GOLD,true);}

  // Low-poly details are used only by the two reviewed external configurations.
  // All dimensions below are display units; facets and insulation are schematic.
  type Point3=[number,number,number];
  function detailRod(g:THREE.Group,a:Point3,b:Point3,r=.02,color=SILVER,external=false){
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
    const m=mesh(g,new THREE.CylinderGeometry(r,r,delta.length(),10),color,start.add(end).multiplyScalar(.5).toArray() as Point3,external);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;
  }
  function face(g:THREE.Group,points:Point3[],color:string,external=false){
    const positions:number[]=[];for(let i=1;i<points.length-1;i++)positions.push(...points[0],...points[i],...points[i+1]);
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();
    return mesh(g,geometry,color,[0,0,0],external);
  }
  function loft(g:THREE.Group,rings:Point3[][],color:string,external=false){
    const positions:number[]=[];const add=(a:Point3,b:Point3,c:Point3)=>positions.push(...a,...b,...c);
    for(let j=0;j<rings.length-1;j++)for(let i=0;i<rings[j].length;i++){
      const k=(i+1)%rings[j].length;add(rings[j][i],rings[j+1][i],rings[j+1][k]);add(rings[j][i],rings[j+1][k],rings[j][k]);
    }
    for(const [ring,reverse] of [[rings[0],true],[rings[rings.length-1],false]] as const)for(let i=1;i<ring.length-1;i++){
      if(reverse)add(ring[0],ring[i+1],ring[i]);else add(ring[0],ring[i],ring[i+1]);
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();
    return mesh(g,geometry,color,[0,0,0],external);
  }

  const id=vehicle.id.toLowerCase(),kind=model.kind;
  const context={vehicle,model,available,group,mesh,box,cylinder,sphere,rod,ring,electronics,engine,solar,antenna,detailRod,face,loft,SILVER,DARK,GOLD,BLUE,GREEN};
  const reviewed=buildRocketModel(context)||buildSpacecraftModel(context)||buildSurfaceModel(context);
  if(reviewed){
    // Individual, source-reviewed configurations are built in separate modules.
  }else if(id==='tiros-1'){
    // NASA TIROS: 18-sided flat drum. Exterior ratio follows 42 × 19 inches;
    // camera/electronics placement and antenna lengths remain schematic.
    const r=1.2,h=2*r*model.height/model.diameter;
    const body=group('body',new THREE.Vector3(-1.5,0,0));mesh(body,new THREE.CylinderGeometry(r,r,h,18),SILVER,[0,0,0],true);
    const power=group('service',new THREE.Vector3(1.5,.3,0));
    for(let i=0;i<18;i++){const a=i*Math.PI/9;const p=box(power,[.35,h*.72,.025],[Math.sin(a)*r*.99,0,Math.cos(a)*r*.99],BLUE,true);p.rotation.y=a;for(let j=0;j<3;j++){const q=box(power,[.35,.008,.03],[Math.sin(a)*r,.25-j*.25,Math.cos(a)*r],'#7c9bb4',true);q.rotation.y=a;}}
    cylinder(power,.83,.04,[0,h/2+.025,0],BLUE,.83,true);for(const x of [-.38,.38])cylinder(power,.19,.35,[x,-.05,0],GOLD);
    const ant=group('antenna',new THREE.Vector3(0,-1.4,0));for(let i=0;i<4;i++){const a=i*Math.PI/2;detailRod(ant,[Math.cos(a)*.7,-h/2,Math.sin(a)*.7],[Math.cos(a)*1.35,-h/2-1.1,Math.sin(a)*1.35],.015,SILVER,true);}detailRod(ant,[0,h/2,0],[0,h/2+.8,0],.017,SILVER,true);
    const ins=group('instruments',new THREE.Vector3(0,1.4,1));for(const x of [-.35,.35]){cylinder(ins,.22,.45,[x,-h/2+.08,0],DARK,.22);cylinder(ins,.16,.035,[x,-h/2-.16,0],'#6f96b6');}
    const av=group('avionics',new THREE.Vector3(1,1,0));for(const z of [-.38,.38])box(av,[.65,.2,.3],[0,.12,z],GOLD);electronics(av,-.12,4,.6);
    const frame=group('frame',new THREE.Vector3(0,-1,1));mesh(frame,new THREE.CylinderGeometry(r*.94,r*.94,.06,18),DARK,[0,-h*.4,0]);
  }else if(id==='telstar-1'){
    // Faceted body, body-mounted photovoltaics and equatorial antenna band.
    // No Sputnik-style whip antennas. Tiles are a visual layout, not cell CAD.
    const body=group('body',new THREE.Vector3(-1.6,0,0));mesh(body,new THREE.IcosahedronGeometry(1.1,1),SILVER,[0,0,0],true);
    const power=group('service',new THREE.Vector3(1.6,0,0));for(const lat of [-.9,-.5,.5,.9]){const r=Math.sqrt(1.13**2-lat**2),n=Math.round(r*18);for(let i=0;i<n;i++){const a=i*Math.PI*2/n;const p=mesh(power,new THREE.CircleGeometry(.105,6),BLUE,[Math.sin(a)*r,lat,Math.cos(a)*r],true);p.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),p.position.clone().normalize());}}
    const ant=group('antenna',new THREE.Vector3(0,.8,1.3));for(const y of [-.18,.18])ring(ant,1.105,y,DARK);for(let i=0;i<48;i++){const a=i*Math.PI/24;const tile=box(ant,[.045,.1,.015],[Math.sin(a)*1.115,0,Math.cos(a)*1.115],GOLD,true);tile.rotation.y=a;}
    const av=group('avionics',new THREE.Vector3(0,1.5,0));electronics(av,.05,8,.55);cylinder(av,.28,.5,[0,0,0],GOLD);
    const ins=group('instruments',new THREE.Vector3(1.2,.5,1));box(ins,[.3,.25,.3],[0,.7,0],DARK);sphere(ins,.07,[0,.94,0],'#8fa8bd');
    const frame=group('frame',new THREE.Vector3(0,-1.4,0));cylinder(frame,.8,.055,[0,-.4,0],DARK);
  }else if(id==='landsat-1'){
    // Nimbus-derived body and two deployed solar wings; nadir instrument face.
    const body=group('body',new THREE.Vector3(-1.4,0,0));box(body,[1.5,2.2,1.2],[0,.15,0],SILVER,true);cylinder(body,.6,.5,[0,1.5,0],DARK,.45,true);
    const sol=group('solar',new THREE.Vector3(1.6,0,1));for(const side of [-1,1]){detailRod(sol,[side*.65,.6,0],[side*1.65,.6,0],.035);solar(sol,side*2.3,.6,2.2,1.2);}
    const ins=group('instruments',new THREE.Vector3(0,-1.3,1.2));box(ins,[.6,.45,.7],[-.35,-1.12,0],DARK);for(const x of [-.45,0,.45]){cylinder(ins,.15,.35,[x,-1.1,.37],GOLD);cylinder(ins,.12,.035,[x,-1.3,.37],'#6688ab');}
    const ant=group('antenna',new THREE.Vector3(1.2,1.3,0));for(const side of [-1,1])detailRod(ant,[side*.6,1.3,0],[side*1.1,2.05,0],.014);antenna(ant,-.4,.25,.8);
    const prop=group('propulsion',new THREE.Vector3(0,-1.5,0));for(let i=0;i<3;i++){const a=i*Math.PI*2/3;engine(prop,.1,-1.1,Math.cos(a)*.5,Math.sin(a)*.5);}
    const av=group('avionics',new THREE.Vector3(1.2,.5,0));electronics(av,.6,6,.45);box(av,[.8,.35,.6],[0,-.3,0],GOLD);
    const frame=group('frame',new THREE.Vector3(-1,-1,0));box(frame,[1.3,.08,1.05],[0,-.8,0],DARK);for(const x of [-.6,.6])detailRod(frame,[x,-.8,-.45],[x,1.2,.45],.035);
  }else if(id==='viking-1-lander'){
    // NASA Viking lander: hexagonal platform, three legs, two RTGs, no wings.
    const body=group('body',new THREE.Vector3(-1.6,.3,0));mesh(body,new THREE.CylinderGeometry(1.1,1.1,.42,6),SILVER,[0,0,0],true);
    const legs=group('legs',new THREE.Vector3(0,-1.3,0));for(let i=0;i<3;i++){const a=i*Math.PI*2/3;const foot:[number,number,number]=[Math.cos(a)*1.8,-1.1,Math.sin(a)*1.8];detailRod(legs,[Math.cos(a)*.8,-.1,Math.sin(a)*.8],foot,.045);detailRod(legs,[Math.cos(a+.3)*.9,.15,Math.sin(a+.3)*.9],foot,.025);cylinder(legs,.24,.06,foot,DARK);}
    const rtg=group('service',new THREE.Vector3(1.6,.3,-.8));for(const side of [-1,1]){const x=side*1.1;const gen=cylinder(rtg,.2,.65,[x,.32,-.45],DARK);gen.rotation.z=Math.PI/2;for(let j=0;j<9;j++){const fin=mesh(rtg,new THREE.CylinderGeometry(.32,.32,.025,12),SILVER,[x+(j-4)*.07,.32,-.45]);fin.rotation.z=Math.PI/2;}}
    const ins=group('instruments',new THREE.Vector3(1,1.4,0));for(const x of [-.45,.45]){cylinder(ins,.055,.7,[x,.57,.4],SILVER);cylinder(ins,.09,.15,[x,.98,.4],DARK);}detailRod(ins,[.6,.2,.65],[.9,.3,1.3],.05);detailRod(ins,[.9,.3,1.3],[1.2,-.6,1.85],.035);box(ins,[.25,.1,.18],[1.2,-.62,1.85],DARK);box(ins,[.5,.23,.4],[0,.3,0],GOLD);
    const prop=group('propulsion',new THREE.Vector3(0,-1.5,1));for(let i=0;i<3;i++){const a=i*Math.PI*2/3;engine(prop,.16,-.2,Math.cos(a)*.8,Math.sin(a)*.8);}
    const tank=group('tank',new THREE.Vector3(-1.4,0,1));for(const x of [-.4,.4])sphere(tank,.25,[x,-.1,0],GOLD);
    const av=group('avionics',new THREE.Vector3(0,1.3,-1));electronics(av,.05,6,.55);
    const ant=group('antenna',new THREE.Vector3(-.7,1.5,-.8));antenna(ant,.6,.38,0);detailRod(ant,[.7,.2,-.2],[.7,1.1,-.2],.016);
    const frame=group('frame',new THREE.Vector3(0,-.8,-1));mesh(frame,new THREE.CylinderGeometry(.96,.96,.06,6),DARK,[0,-.17,0]);
  }else if(id==='mro'){
    // Mars Reconnaissance Orbiter: two solar wings and 3 m high-gain dish.
    const body=group('body',new THREE.Vector3(-1.5,0,0));box(body,[1.3,1.7,1.15],[0,0,0],GOLD,true);box(body,[1.36,.6,1.2],[0,-.6,0],SILVER,true);
    const sol=group('solar',new THREE.Vector3(1.6,0,1));for(const side of [-1,1]){detailRod(sol,[side*.65,.1,0],[side*1.4,.1,0],.05);solar(sol,side*2.6,.1,2.6,1.55);}
    const ant=group('antenna',new THREE.Vector3(0,1.6,0));antenna(ant,1.1,.86);detailRod(ant,[-.45,.8,0],[0,1.1,0],.04);
    const ins=group('instruments',new THREE.Vector3(1.5,-.4,0));cylinder(ins,.23,1.4,[.48,-.1,.6],DARK);cylinder(ins,.18,.03,[.48,-.82,.6],'#739bb7');box(ins,[.3,.5,.35],[-.4,-.4,.64],SILVER);detailRod(ins,[0,-.6,0],[0,-.6,2.8],.014);detailRod(ins,[0,-.6,0],[0,-.6,-2.8],.014);
    const prop=group('propulsion',new THREE.Vector3(0,-1.4,0));for(let i=0;i<6;i++){const a=i*Math.PI/3;engine(prop,.09,-.9,Math.cos(a)*.4,Math.sin(a)*.4);}
    const av=group('avionics',new THREE.Vector3(-1,1,-1));electronics(av,.3,8,.43);
    const frame=group('frame',new THREE.Vector3(0,-.8,1));box(frame,[1.1,.07,1],[0,-.68,0],DARK);for(const x of [-.5,.5])detailRod(frame,[x,-.65,-.4],[x,.7,.4],.03);
  }else if(id==='euclid'){
    // ESA Euclid: two modules, single telescope aperture and fixed side shield.
    // Fixed side photovoltaics replace the generic telescope's deployable wings.
    const body=group('body',new THREE.Vector3(-1.5,0,0));box(body,[1.4,.7,1.4],[0,-.8,0],SILVER,true);cylinder(body,.68,1.7,[0,.4,0],SILVER,.72,true);ring(body,.73,1.25,DARK);
    const ins=group('instruments',new THREE.Vector3(0,1.6,0));cylinder(ins,.53,.05,[0,.9,0],'#758fa2');cylinder(ins,.15,.08,[0,1.05,0],DARK);for(let i=0;i<3;i++){const a=i*Math.PI*2/3;detailRod(ins,[0,1.05,0],[Math.cos(a)*.58,1.1,Math.sin(a)*.58],.014);}box(ins,[.55,.35,.5],[0,-.25,0],GOLD);
    const shield=group('heatshield',new THREE.Vector3(0,.3,-1.5));box(shield,[2.15,2.8,.07],[0,.17,-.85],SILVER,true);for(const x of [-.9,.9])detailRod(shield,[x,-1.2,-.75],[x,1.55,-.75],.025);
    const sol=group('solar',new THREE.Vector3(0,0,-2));box(sol,[2.05,2.6,.025],[0,.17,-.902],BLUE,true);for(let i=0;i<9;i++)box(sol,[.012,2.6,.03],[-1+i*.25,.17,-.92],'#6886a2');for(let j=0;j<8;j++)box(sol,[2.05,.012,.03],[0,-1.1+j*.36,-.92],'#6886a2');
    const prop=group('propulsion',new THREE.Vector3(1.5,-1,0));for(const x of [-.53,.53])engine(prop,.09,-1.15,x);sphere(prop,.3,[0,-.72,0],GOLD);
    const av=group('avionics',new THREE.Vector3(-1,-1,.8));electronics(av,-.68,6,.48);
    const ant=group('antenna',new THREE.Vector3(1,0,1.2));antenna(ant,-.65,.25,.9);
    const frame=group('frame',new THREE.Vector3(0,-1.4,0));box(frame,[1.25,.07,1.25],[0,-1.05,0],DARK);
  }else if(kind==='rocket'){
    const height=8;const r=Math.max(.19,Math.min(.7,model.diameter/model.height*height/2));
    const stages=Math.min(3,Math.max(1,model.stages||2));
    const h1=stages===1?5.8:4.2,h2=stages===3?1.45:2.0;
    const s1=group('stage-1',new THREE.Vector3(0,-1.4,0));cylinder(s1,r,h1,[0,-1.3,0],model.color,r,true);ring(s1,r,-1.3-h1/2);ring(s1,r,-1.3+h1/2);
    for(let j=0;j<12;j++){const a=j*Math.PI/6;rod(s1,new THREE.Vector3(Math.cos(a)*r,-1.3-h1/2,Math.sin(a)*r),new THREE.Vector3(Math.cos(a)*r,-1.3+h1/2,Math.sin(a)*r),.008,'#7d8a88');}
    const tanks=group('tank',new THREE.Vector3(1.5,.1,0));cylinder(tanks,r*.86,h1*.43,[0,-2.2,0],'#709aab');sphere(tanks,r*.86,[0,-2.2+h1*.215,0],'#709aab').scale.y=.45;sphere(tanks,r*.86,[0,-2.2-h1*.215,0],'#709aab').scale.y=.45;cylinder(tanks,r*.86,h1*.33,[0,-.5,0],GOLD);sphere(tanks,r*.86,[0,-.5+h1*.165,0],GOLD).scale.y=.45;
    const eng=group('engine',new THREE.Vector3(0,-2.4,0));const count=model.engineCount||(id.includes('falcon')?9:id.includes('saturn')?5:id.includes('electron')?9:1);for(let i=0;i<count;i++){if(count===33){const ring=i<3?0:i<13?1:2,start=ring===0?0:ring===1?3:13,n=ring===0?3:ring===1?10:20,rr=r*[.18,.48,.83][ring],a=(i-start)*Math.PI*2/n;engine(eng,r*.10,-3.4,Math.cos(a)*rr,Math.sin(a)*rr);continue;}const central=count===1||count===5||count===7||count===9;const ringCount=central?count-1:count;const a=ringCount?i*Math.PI*2/ringCount:0;const rr=central&&i===count-1?0:r*.62;engine(eng,count===1?r*.8:r*.27,-3.4,Math.cos(a)*rr,Math.sin(a)*rr);}
    if(stages>1){const s2=group('stage-2',new THREE.Vector3(0,.8,0));cylinder(s2,r,h2,[0,1.75,0],SILVER,r,true);ring(s2,r,1.75-h2/2);const it=group('propulsion',new THREE.Vector3(-1.1,.9,0));cylinder(it,r*.8,h2*.65,[0,1.85,0],GOLD);engine(it,r*.55,1.75-h2/2);}
    if(stages===3){const s3=group('stage-3',new THREE.Vector3(0,1.6,0));cylinder(s3,r*(id.includes('saturn')?.66:.84),.7,[0,2.95,0],SILVER,r*(id.includes('saturn')?.66:.84),true);engine(s3,r*.4,2.6);}
    const fair=group('fairing',new THREE.Vector3(-1.1,2.3,0));const fy=stages===3?3.8:3.25;const fairR=r*(id.includes('falcon')?1.405:/saturn|sls/.test(id)?.63:1);cylinder(fair,fairR,.65,[0,fy,0],model.color,fairR,true);mesh(fair,new THREE.ConeGeometry(fairR,.8,48),model.color,[0,fy+.7,0],true);if(/saturn|sls/.test(id)){rod(fair,new THREE.Vector3(0,fy+1.1,0),new THREE.Vector3(0,fy+1.75,0),.025);}
    const payload=group('payload',new THREE.Vector3(1.2,2.3,0));cylinder(payload,r*.63,.55,[0,fy,0],GOLD);electronics(payload,fy+.1,4,r*.45);
    const avionics=group('avionics',new THREE.Vector3(1.4,.5,.6));electronics(avionics,.9,8,r*.65);
    const boosters=Math.min(6,model.boosters||0);if(boosters){const g=group('boosters',new THREE.Vector3(1.6,-.7,1.3));for(let i=0;i<boosters;i++){const a=i*Math.PI*2/boosters+Math.PI/2,x=Math.cos(a)*r*2.25,z=Math.sin(a)*r*2.25;const br=r*.65;cylinder(g,br,3.7,[x,-1.65,z],SILVER,br,true);mesh(g,new THREE.ConeGeometry(br,.55,32),SILVER,[x,.475,z],true);engine(g,br*.8,-3.5,x,z);}}
  }else if(kind==='sphere-satellite'){
    const body=group('body',new THREE.Vector3(-1.2,0,0));sphere(body,1.15,[0,0,0],SILVER,true);ring(body,1.15,0,'#899899');
    const antennas=group('antenna',new THREE.Vector3(1.2,-.7,0));for(let i=0;i<4;i++){const a=i*Math.PI/2;rod(antennas,new THREE.Vector3(Math.cos(a)*.8,-.5,Math.sin(a)*.8),new THREE.Vector3(Math.cos(a)*2,-3.1-(i%2)*.5,Math.sin(a)*2),.018);}
    const avionics=group('avionics',new THREE.Vector3(0,1.4,0));electronics(avionics,.25,6,.5);cylinder(avionics,.38,.5,[0,.1,0],GREEN);
    const tank=group('service',new THREE.Vector3(1.1,.3,0));for(let i=0;i<3;i++)cylinder(tank,.16,.65,[(i-1)*.34,-.45,0],GOLD);
    const instruments=group('instruments',new THREE.Vector3(0,.7,1.1));box(instruments,[.6,.25,.45],[0,.65,0],DARK);
    const frame=group('frame',new THREE.Vector3(0,-.5,1.5));cylinder(frame,.92,.08,[0,-.2,0],DARK);
  }else if(kind==='cylinder-satellite'&&id==='tianzhou'){
    const body=group('body',new THREE.Vector3(-1.5,0,0));cylinder(body,.8,2.6,[0,.35,0],SILVER,.8,true);cylinder(body,.8,.4,[0,1.85,0],SILVER,.4,true);
    const payload=group('payload',new THREE.Vector3(1.5,.4,0));for(let i=0;i<8;i++)box(payload,[.4,.45,.4],[(i%2?1:-1)*.36,-.6+Math.floor(i/2)*.55,0],i%2?GOLD:GREEN);
    const service=group('service',new THREE.Vector3(0,-1.7,0));cylinder(service,.66,.8,[0,-1.35,0],SILVER,.66,true);for(const x of [-.3,.3])engine(service,.15,-1.75,x);
    const docking=group('docking',new THREE.Vector3(0,1.7,0));cylinder(docking,.28,.2,[0,2.13,0],DARK);
    const sol=group('solar',new THREE.Vector3(1.6,0,1));solar(sol,-2,-1.2,2.5,1);solar(sol,2,-1.2,2.5,1);
    const tank=group('tank',new THREE.Vector3(-1.5,-1,0));for(const x of [-.3,.3])sphere(tank,.25,[x,-1.3,0],GOLD);
    const av=group('avionics',new THREE.Vector3(0,1.2,1));electronics(av,1.2,6,.5);
  }else if(kind==='cylinder-satellite'){
    const body=group('body',new THREE.Vector3(-1.1,0,0));cylinder(body,.4,3.5,[0,0,0],model.color,.4,true);mesh(body,new THREE.ConeGeometry(.4,.65,48),SILVER,[0,2.08,0],true);ring(body,.4,-1);ring(body,.4,.8);
    const a=group('antenna',new THREE.Vector3(1.1,.7,0));for(let i=0;i<4;i++){const t=i*Math.PI/2;rod(a,new THREE.Vector3(0,.7,0),new THREE.Vector3(Math.cos(t)*1.6,.7,Math.sin(t)*1.6),.012);}
    const av=group('avionics',new THREE.Vector3(0,1.5,0));electronics(av,.7,4,.2);const ins=group('instruments',new THREE.Vector3(1,.3,0));cylinder(ins,.25,.7,[0,.1,0],GOLD);const p=group('frame',new THREE.Vector3(0,-1.2,0));cylinder(p,.3,.1,[0,-1.45,0],DARK);const t=group('service',new THREE.Vector3(1,-.6,0));cylinder(t,.3,.7,[0,-.7,0],GREEN);
  }else if(kind==='capsule'||kind==='apollo'){
    const soviet=/soyuz|shenzhou|vostok/.test(id),vostok=id.includes('vostok'),mercury=id.includes('mercury');const seatCount=model.crewCount||(/vostok|mercury/.test(id)?1:id.includes('gemini')?2:/dragon|orion/.test(id)?4:3);
    const body=group('body',new THREE.Vector3(-1.6,.3,0));if(vostok)sphere(body,1,[0,.7,0],SILVER,true);else cylinder(body,1.05,1.2,[0,.7,0],model.color,.35,true);
    const crew=group('crew',new THREE.Vector3(1.5,.5,0));for(let i=0;i<seatCount;i++){const seatX=(i-(seatCount-1)/2)*Math.min(.48,1.3/seatCount);const seat=box(crew,[.3,.5,.4],[seatX,.55,0],'#c58456');seat.rotation.x=-.3;sphere(crew,.12,[seatX,.9,-.1],SILVER);}box(crew,[1.1,.25,.12],[0,.8,.43],DARK);
    const heat=group('heatshield',new THREE.Vector3(0,-1.5,0));cylinder(heat,1.06,.12,[0,.08,0],DARK);
    const service=group('service',new THREE.Vector3(0,-.9,0));cylinder(service,.88,mercury?.25:1.4,[0,mercury?-.18:-.8,0],soviet?'#4e7165':SILVER,.88,true);ring(service,.88,mercury?-.3:-1.5);ring(service,.88,-.1);
    const tank=group('tank',new THREE.Vector3(1.7,-.6,0));for(let i=0;i<4;i++){const a=i*Math.PI/2;sphere(tank,mercury?.14:.3,[Math.cos(a)*.45,mercury?-.18:-.75,Math.sin(a)*.45],GOLD);}
    const engineG=group('propulsion',new THREE.Vector3(0,-2.1,0));engine(engineG,mercury?.18:.48,mercury?-.3:-1.5);
    const av=group('avionics',new THREE.Vector3(-1.4,-.5,.5));electronics(av,-.2,6,.55);
    const dock=group(available.has('docking')?'docking':'instruments',new THREE.Vector3(0,1.8,0));if(soviet&&!vostok){sphere(dock,.73,[0,1.9,0],model.color,true);cylinder(dock,.25,.3,[0,2.7,0],DARK);}else cylinder(dock,vostok?.12:.3,vostok?.1:.3,[0,vostok?1.7:1.45,0],DARK);if(available.has('antenna')){const ant=group('antenna',new THREE.Vector3(-1.5,-1,0));for(let i=0;i<4;i++)antenna(ant,-1.2,.16,-1.2+i*.22);}
    if(model.solarPanels){const g=group('solar',new THREE.Vector3(1.4,0,1.3));solar(g,-2,-.6,2.4,1.1);solar(g,2,-.6,2.4,1.1);rod(g,new THREE.Vector3(-3,-.6,0),new THREE.Vector3(3,-.6,0),.035);}
  }else if(kind==='station'){
    const body=group('body',new THREE.Vector3(0,.8,0));const count=id.includes('iss')?7:id.includes('mir')?5:id.includes('tiangong')?3:2;
    for(let i=0;i<count;i++){const x=(i-Math.floor(count/2))*.95;const mod=cylinder(body,.43,1.6,[x,0,0],i%2?SILVER:'#bdc8b4',.43,true);mod.rotation.z=i%3===0?0:Math.PI/2;}
    const frame=group('frame',new THREE.Vector3(0,-1,0));rod(frame,new THREE.Vector3(-4,0,0),new THREE.Vector3(4,0,0),.11);for(let i=-4;i<=4;i++)box(frame,[.06,.5,.5],[i,0,0],DARK);
    const sol=group('solar',new THREE.Vector3(0,0,1.8));const panels=Math.max(2,Math.min(8,model.solarPanels||4));for(let i=0;i<panels;i++){const x=-3.4+i*6.8/(panels-1);solar(sol,x,0,.7,4);}
    const dock=group('docking',new THREE.Vector3(0,0,-1.6));for(let i=-1;i<=1;i++){const d=cylinder(dock,.27,.3,[i*1.8,0,1.0],DARK);d.rotation.x=Math.PI/2;}
    const av=group('avionics',new THREE.Vector3(-1.8,1,0));electronics(av,.15,8,.45);const crew=group('crew',new THREE.Vector3(0,1.7,0));for(let i=-2;i<3;i++)box(crew,[.3,.5,.32],[i*.7,.1,0],GREEN);
    const ins=group('instruments',new THREE.Vector3(1.3,1,0));box(ins,[.7,.45,.5],[1.7,.65,0],GOLD);
    const a=group('antenna',new THREE.Vector3(1.4,1.5,0));antenna(a,1,.35,-1);
  }else if(kind==='shuttle'){
    const body=group('body',new THREE.Vector3(-1.5,0,0));cylinder(body,.58,4.8,[0,0,0],SILVER,.5,true);mesh(body,new THREE.ConeGeometry(.5,1.2,48),SILVER,[0,3,0],true);
    const frame=group('frame',new THREE.Vector3(1.4,0,0));for(const sign of [-1,1]){const s=new THREE.Shape();s.moveTo(.4*sign,1);s.lineTo(2.5*sign,-2);s.lineTo(.4*sign,-1.8);s.closePath();const wing=mesh(frame,new THREE.ExtrudeGeometry(s,{depth:.1,bevelEnabled:false}),SILVER);wing.position.z=-.2;}
    const payload=group('payload',new THREE.Vector3(0,1,1.3));cylinder(payload,.35,2.5,[0,.2,0],GOLD);const crew=group('crew',new THREE.Vector3(0,2,.6));box(crew,[.6,.8,.5],[0,1.8,0],GREEN);const heat=group('heatshield',new THREE.Vector3(0,0,-1.4));box(heat,[.85,4.5,.12],[0,-.2,-.48],DARK);
    const engines=group('engine',new THREE.Vector3(0,-2,0));engine(engines,.25,-2.4,-.35);engine(engines,.25,-2.4,.35);engine(engines,.25,-2.4,0,.35);const av=group('avionics',new THREE.Vector3(1.3,1.5,0));electronics(av,1.5,5,.35);
  }else if(id==='apollo-lm'){
    // NASA Apollo operations handbooks / exterior photographs: deployed LM.
    // +Z is the forward hatch and ladder; the astronauts stand in the cabin.
    const descent=group('stage-1',new THREE.Vector3(0,-1,0));
    const outline:[number,number][]=[[-.72,1.10],[.72,1.10],[1.10,.72],[1.10,-.72],[.72,-1.10],[-.72,-1.10],[-1.10,-.72],[-1.10,.72]];
    const descentRing=(y:number,scale=1):Point3[]=>outline.map(([x,z])=>[x*scale,y,z*scale]);
    loft(descent,[descentRing(-.76),descentRing(-.12),descentRing(-.045,.97)],'#bc9453',true).name='descent-octagonal-envelope';
    // Dark thermal panels and narrow borders expose the eight-sided envelope.
    for(let i=0;i<outline.length;i++){
      const [ax,az]=outline[i],[bx,bz]=outline[(i+1)%outline.length];
      const inset=(t:number,y:number):Point3=>[(ax+(bx-ax)*t)*1.004,y,(az+(bz-az)*t)*1.004];
      face(descent,[inset(.08,-.19),inset(.92,-.19),inset(.92,-.64),inset(.08,-.64)],i%2?'#c6a467':'#333c3a',true);
      detailRod(descent,[ax,-.11,az],[bx,-.11,bz],.012,'#e0be79',true);
    }
    const ascent=group('stage-2',new THREE.Vector3(0,1.3,0));
    const cabinRing=(y:number,front:number,width:number,rear:number):Point3[]=>[
      [-width*.70,y,front],[width*.70,y,front],[width,y,front*.32],[width*.88,y,-rear*.65],
      [width*.45,y,-rear],[-width*.45,y,-rear],[-width*.92,y,-rear*.65],[-width,y,front*.30]
    ];
    loft(ascent,[cabinRing(.02,.72,.72,.63),cabinRing(.56,.89,.88,.75),cabinRing(1.26,.60,.70,.67),cabinRing(1.48,.31,.48,.48)],'#b9c0bd',true).name='ascent-faceted-cabin';
    for(const sign of [-1,1]){
      const pod:Point3[][]=[-.37,.31].map(z=>[[sign*.66,.08,z],[sign*1.02,.20,z],[sign*1.08,.73,z],[sign*.83,1.04,z],[sign*.60,.67,z]] as Point3[]);
      loft(ascent,pod,sign<0?'#bda06a':'#404b48',true).name='ascent-equipment-fairing';
      face(ascent,[[sign*.02,.74,.815],[sign*.65,.68,.865],[sign*.62,1.23,.626]],'#252f30',true);
      const window:Point3[]=[[sign*.14,.84,.791],[sign*.58,.79,.815],[sign*.51,1.16,.658]];
      face(ascent,window,'#142f3a',true).name='triangular-forward-window';
      for(let j=0;j<3;j++)detailRod(ascent,window[j],window[(j+1)%3],.013,'#d8dcd0',true);
    }
    // Forward rectangular EVA hatch below the two sloping triangular windows.
    face(ascent,[[-.27,.12,.903],[.27,.12,.903],[.27,.65,.903],[-.27,.65,.903]],'#7d8880',true).name='forward-eva-hatch';
    for(const sign of [-1,1])detailRod(ascent,[sign*.28,.11,.912],[sign*.28,.66,.912],.013,SILVER,true);
    detailRod(ascent,[-.28,.66,.912],[.28,.66,.912],.013,SILVER,true);detailRod(ascent,[-.28,.11,.912],[.28,.11,.912],.013,SILVER,true);
    detailRod(ascent,[.13,.35,.934],[.22,.35,.934],.017,DARK,true);
    // Four reaction-control quads; nozzle axes are functional rather than surveyed.
    for(const sx of [-1,1])for(const sz of [-1,1]){
      const center=new THREE.Vector3(sx*.96,.88,sz*.49);box(ascent,[.16,.19,.16],center.toArray() as Point3,'#d6c7a0',true);
      for(const direction of [new THREE.Vector3(0,1,0),new THREE.Vector3(0,-1,0),new THREE.Vector3(sx,0,0),new THREE.Vector3(0,0,sz)]){
        const nozzle=mesh(ascent,new THREE.CylinderGeometry(.067,.026,.13,12),DARK,center.clone().addScaledVector(direction,.13).toArray() as Point3,true);
        nozzle.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction);nozzle.name='rcs-nozzle';
      }
    }
    detailRod(ascent,[-.63,1.20,-.20],[-.77,1.77,-.20],.025);
    const dishProfile=Array.from({length:9},(_,i)=>new THREE.Vector2(i*.033,.14*(i/8)**2));
    const dish=mesh(ascent,new THREE.LatheGeometry(dishProfile,24),SILVER,[-.77,1.78,-.16],true);dish.rotation.x=Math.PI/2;dish.name='steerable-antenna-schematic';
    detailRod(ascent,[0,1.37,.39],[0,1.75,.54],.021);
    const radarProfile=Array.from({length:9},(_,i)=>new THREE.Vector2(i*.026,.09*(i/8)**2));
    const radar=mesh(ascent,new THREE.LatheGeometry(radarProfile,24),SILVER,[0,1.78,.54],true);radar.rotation.x=Math.PI/2;radar.name='rendezvous-radar-antenna';
    detailRod(ascent,[.56,1.25,-.25],[.72,1.91,-.25],.012);detailRod(ascent,[.58,1.86,-.25],[.86,1.86,-.25],.009);
    const docking=group('docking',new THREE.Vector3(0,2.1,0));
    mesh(docking,new THREE.CylinderGeometry(.22,.28,.17,24),SILVER,[0,1.55,-.08],true);mesh(docking,new THREE.CylinderGeometry(.17,.17,.025,24),DARK,[0,1.647,-.08]);
    face(ascent,[[.10,1.34,.501],[.29,1.34,.501],[.27,1.455,.349],[.10,1.455,.349]],'#213c46',true).name='overhead-docking-window';
    const legs=group('legs',new THREE.Vector3(1.1,-1.0,.8));
    for(let i=0;i<4;i++){
      const angle=i*Math.PI/2,radial=new THREE.Vector3(Math.sin(angle),0,Math.cos(angle)),tangent=new THREE.Vector3(Math.cos(angle),0,-Math.sin(angle));
      const at=(r:number,y:number,side=0):Point3=>radial.clone().multiplyScalar(r).addScaledVector(tangent,side).setY(y).toArray() as Point3;
      detailRod(legs,at(.91,-.18),at(2.12,-1.42),.055,'#b6a67d');
      detailRod(legs,at(1.31,-.59),at(1.78,-1.07),.067,'#d8c690');
      for(const side of [-.55,.55])detailRod(legs,at(.72,-.66,side),at(2.02,-1.31),.025,'#aeb2a2');
      const foot=mesh(legs,new THREE.CylinderGeometry(.25,.30,.065,24),SILVER,at(2.12,-1.465));foot.name='landing-footpad';
    }
    box(legs,[.73,.055,.47],[0,.015,1.15],'#9e9e83');
    for(const side of [-.22,.22])detailRod(legs,[side,-.02,1.29],[side,-1.32,2.055],.022,'#c6b897');
    for(let i=0;i<9;i++){const t=i/8;detailRod(legs,[-.22,-.08-t*1.18,1.326+t*.694],[.22,-.08-t*1.18,1.326+t*.694],.018,SILVER).name='ladder-rung';}
    const engines=group('engine',new THREE.Vector3(0,-1.7,0));engine(engines,.36,-.69);engine(engines,.21,.04,0,-.13);
    const crew=group('crew',new THREE.Vector3(1.4,1.4,0));
    box(crew,[.99,.045,.64],[0,.16,.10],DARK);box(crew,[.89,.27,.10],[0,.79,.39],'#344f52');
    for(const sign of [-1,1]){detailRod(crew,[sign*.33,.21,.13],[sign*.33,.68,.18],.014,SILVER);box(crew,[.26,.16,.025],[sign*.24,.82,.455],'#90a59b');}
    crew.userData.geometryEvidence='illustrative cabin volume; no reconstructed internal layout';
  }else if(id==='luna-9'){
    // Landed spherical capsule with four open stabilizing petals, not landing legs.
    const body=group('body',new THREE.Vector3(-1.2,0,0));
    mesh(body,new THREE.SphereGeometry(.58,24,16),'#c9cbbd',[0,0,0],true).name='luna-9-spherical-capsule';
    const seam=mesh(body,new THREE.TorusGeometry(.58,.012,6,32),'#83908c',[0,0,0],true);seam.rotation.x=Math.PI/2;seam.name='luna-9-shell-seam';
    const frame=group('frame',new THREE.Vector3(0,-.7,0));
    for(let i=0;i<4;i++){
      const a=i*Math.PI/2+Math.PI/4,c=Math.cos(a),s=Math.sin(a);
      const point=(t:number,u:number):Point3=>{const r=.43+1.1*t,w=.10+.40*Math.pow(Math.sin(Math.PI*t),.65);return [c*r-s*u*w,-.27-.27*Math.sin(Math.PI*t)+.06*t+.11*u*u,s*r+c*u*w];};
      const positions:number[]=[];
      for(let j=0;j<6;j++)for(let k=0;k<4;k++){const a0=point(j/6,k/2-1),b=point((j+1)/6,k/2-1),c0=point((j+1)/6,(k+1)/2-1),d=point(j/6,(k+1)/2-1);positions.push(...a0,...b,...c0,...a0,...c0,...d);}
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.computeVertexNormals();
      mesh(frame,geo,i%2?'#bdc5ba':'#a4b1aa',[0,0,0],true).name='luna-9-open-petal-'+(i+1);
      detailRod(frame,point(0,0),point(.5,0),.012,'#dce1ce',true).name='luna-9-petal-inner-rib-'+(i+1);
      detailRod(frame,point(.5,0),point(1,0),.012,'#dce1ce',true).name='luna-9-petal-outer-rib-'+(i+1);
      detailRod(frame,point(0,-1),point(0,1),.032,DARK,true).name='luna-9-petal-hinge-'+(i+1);
    }
    mesh(frame,new THREE.CylinderGeometry(.43,.43,.055,20),DARK,[0,-.18,0]).name='luna-9-inner-instrument-deck-schematic';
    const ant=group('antenna',new THREE.Vector3(0,.9,1));
    for(let i=0;i<4;i++){const a=i*Math.PI/2,c=Math.cos(a),s=Math.sin(a);detailRod(ant,[c*.31,.39,s*.31],[c*.79,1.24,s*.79],.012,SILVER,true).name='luna-9-rod-antenna-'+(i+1);}
    const ins=group('instruments',new THREE.Vector3(0,1.25,0));
    mesh(ins,new THREE.CylinderGeometry(.095,.11,.27,12),SILVER,[0,.65,0],true).name='luna-9-television-scanner-column';
    mesh(ins,new THREE.CylinderGeometry(.115,.115,.13,12),DARK,[0,.85,0],true).name='luna-9-television-scan-head';
    const scanMirror=box(ins,[.13,.12,.018],[0,.88,.117],'#9aaba8',true);scanMirror.rotation.x=-.3;scanMirror.name='luna-9-television-scan-mirror';
    const av=group('avionics',new THREE.Vector3(1,.4,0));
    box(av,[.27,.20,.25],[-.17,.08,0],GREEN).name='luna-9-radio-electronics-schematic';box(av,[.18,.17,.24],[.16,.08,0],DARK).name='luna-9-program-timer-schematic';
    const service=group('service',new THREE.Vector3(.8,-.7,0));
    for(const sign of [-1,1])mesh(service,new THREE.CylinderGeometry(.12,.12,.29,12),GOLD,[sign*.19,-.29,0]).name='luna-9-battery-schematic-'+sign;
    mesh(service,new THREE.CylinderGeometry(.11,.11,.20,12),'#7e9799',[0,-.03,-.24]).name='luna-9-thermal-service-schematic';
  }else if(id==='venera-7'){
    // First-generation Venus sphere; no camera, landing legs or later disk brake.
    const body=group('body',new THREE.Vector3(-1,0,0));
    mesh(body,new THREE.SphereGeometry(.70,24,16),SILVER,[0,0,0],true).name='venera-7-titanium-pressure-vessel';
    mesh(body,new THREE.CylinderGeometry(.53,.53,.05,20),DARK,[0,-.04,0]).name='venera-7-internal-deck-schematic';
    const heat=group('heatshield',new THREE.Vector3(-1.3,.3,0));
    mesh(heat,new THREE.SphereGeometry(.84,24,16),'#ddd9c6',[0,0,0],true).name='venera-7-spherical-thermal-envelope';
    mesh(heat,new THREE.SphereGeometry(.847,24,8,0,Math.PI*2,Math.PI*.58,Math.PI*.42),'#aaa995',[0,0,0],true).name='venera-7-lower-thermal-protection';
    const seam=mesh(heat,new THREE.TorusGeometry(.843,.009,6,32),'#9b9c89',[0,0,0],true);seam.rotation.x=Math.PI/2;seam.name='venera-7-envelope-seam';
    const frame=group('frame',new THREE.Vector3(0,1.15,0));
    mesh(frame,new THREE.CylinderGeometry(.23,.28,.12,20),'#a7aca2',[0,.81,0],true).name='venera-7-upper-parachute-compartment';
    mesh(frame,new THREE.CylinderGeometry(.15,.19,.12,16),SILVER,[0,.93,0],true).name='venera-7-parachute-attachment-base';
    mesh(frame,new THREE.TorusGeometry(.075,.014,6,16),SILVER,[0,1.065,0],true).name='venera-7-parachute-attachment-loop-schematic';
    const service=group('service',new THREE.Vector3(.7,-.8,0));
    mesh(service,new THREE.CylinderGeometry(.18,.18,.33,12),GOLD,[-.21,-.22,0]).name='venera-7-battery-schematic';
    box(service,[.30,.24,.27],[.20,-.24,0],'#7e9799').name='venera-7-thermal-accumulator-schematic';
    const ant=group('antenna',new THREE.Vector3(.8,.8,0));
    mesh(ant,new THREE.CylinderGeometry(.06,.07,.13,12),DARK,[.18,.94,0],true).name='venera-7-transmitting-antenna-base-schematic';
    detailRod(ant,[.18,1,0],[.18,1.34,0],.012,SILVER,true).name='venera-7-top-antenna-schematic';
    const ins=group('instruments',new THREE.Vector3(1,.2,.5));box(ins,[.24,.17,.21],[.21,.25,.12],GREEN).name='venera-7-temperature-pressure-instrument-envelope';
    const av=group('avionics',new THREE.Vector3(1,.3,-.5));
    box(av,[.25,.18,.22],[-.21,.19,.10],GOLD).name='venera-7-radio-telemetry-schematic';box(av,[.23,.16,.18],[0,.14,-.24],DARK).name='venera-7-program-control-schematic';
  }else if(kind==='lander'||kind==='rover'){
    const body=group('body',new THREE.Vector3(0,1.4,0));box(body,[1.8,1,1.4],[0,.4,0],GOLD,true);const tank=group('tank',new THREE.Vector3(-1.4,0,0));for(let i=0;i<4;i++)sphere(tank,.3,[(i%2?1:-1)*.5,.35,(i<2?1:-1)*.38],SILVER);
    const frame=group('frame',new THREE.Vector3(0,-1,0));box(frame,[1.9,.15,1.5],[0,-.2,0],DARK);const legs=group(kind==='rover'?'wheels':'legs',new THREE.Vector3(1.3,-1.3,1));
    if(kind==='rover'){for(const s of [-1,1])for(let i=-1;i<2;i++){rod(legs,new THREE.Vector3(s*.75,-.2,0),new THREE.Vector3(s*1.25,-.6,i*.8),.045);const w=cylinder(legs,.35,.22,[s*1.3,-.6,i*.8],DARK);w.rotation.z=Math.PI/2;for(let j=0;j<10;j++){const a=j*Math.PI/5;box(legs,[.23,.05,.08],[s*1.3,-.6+Math.cos(a)*.34,i*.8+Math.sin(a)*.34],SILVER);}}}
    else for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4;const b=new THREE.Vector3(Math.cos(a)*1.8,-1.15,Math.sin(a)*1.8);rod(legs,new THREE.Vector3(Math.cos(a)*.8,0,Math.sin(a)*.8),b,.045);rod(legs,new THREE.Vector3(Math.cos(a)*.4,.6,Math.sin(a)*.4),b,.025);cylinder(legs,.25,.07,b.toArray() as [number,number,number],DARK);}
    const ins=group('instruments',new THREE.Vector3(0,1.5,.8));rod(ins,new THREE.Vector3(0,.8,0),new THREE.Vector3(0,2,0),.06);box(ins,[.65,.23,.25],[0,2,0],SILVER);for(const s of [-1,1]){const camera=cylinder(ins,.08,.18,[s*.2,2,.2],DARK);camera.rotation.x=Math.PI/2;}
    const propulsion=group('propulsion',new THREE.Vector3(0,-1.8,0));if(id==='chandrayaan-3'){for(const x of [-.55,.55])for(const z of [-.4,.4])engine(propulsion,.17,-.3,x,z);}else if(kind!=='rover')engine(propulsion,.32,-.3);else box(propulsion,[.65,.3,.45],[0,-.25,0],DARK);
    const av=group('avionics',new THREE.Vector3(1.5,.4,0));electronics(av,.5,6,.5);const ant=group('antenna',new THREE.Vector3(-1.4,1.2,0));antenna(ant,1.05,.42,-.5);
    if(model.solarPanels){const sol=group('solar',new THREE.Vector3(1.5,0,-1));if(id==='chandrayaan-3'){const panel=box(sol,[1.6,.8,.035],[0,.4,.72],BLUE);for(let j=0;j<6;j++)box(sol,[.012,.8,.04],[-.75+j*.3,.4,.72],SILVER);}else{solar(sol,-1.6,.8,1.2,1.5);solar(sol,1.6,.8,1.2,1.5);}}
    if(id.includes('apollo')){const crew=group('crew',new THREE.Vector3(0,2.1,0));box(crew,[1.3,1.1,1.1],[0,1.3,0],SILVER,true);box(crew,[.45,.35,.05],[-.35,1.5,.58],BLUE);box(crew,[.45,.35,.05],[.35,1.5,.58],BLUE);}
  }else if(id==='jwst'){
    // NASA OTE / sunshield publications constrain counts and broad proportions.
    // Membrane gaps, mirror thickness and optical curvature are exaggerated.
    const instruments=group('instruments',new THREE.Vector3(0,1.15,0));
    const mirrorY=1.54,mirrorZ=-.87,pitch=.29;let segment=0;
    for(let q=-2;q<=2;q++)for(let r=-2;r<=2;r++){
      if(Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r))>2||(!q&&!r))continue;
      const x=Math.sqrt(3)*pitch*(q+r/2),y=1.5*pitch*r,depth=.025*(x*x+y*y);
      const h=mesh(instruments,new THREE.CylinderGeometry(.281,.281,.045,6),segment%3===0?'#d2a84c':'#e0ba62',[x,mirrorY+y,mirrorZ+depth],true);
      h.rotation.set(Math.PI/2+y*.035,-x*.035,0);h.name='primary-mirror-segment-'+String(++segment).padStart(2,'0');
      h.userData.feature='primary-mirror-segment';
      const backing=mesh(instruments,new THREE.CylinderGeometry(.277,.277,.065,6),DARK,[x,mirrorY+y,mirrorZ-.075+depth]);backing.rotation.x=Math.PI/2;
    }
    const aos=mesh(instruments,new THREE.CylinderGeometry(.08,.17,.42,16),'#18242b',[0,mirrorY,mirrorZ+.19],true);aos.rotation.x=Math.PI/2;aos.name='aft-optics-baffle';
    box(instruments,[1.04,.83,.44],[0,1.19,-1.27],GOLD,true).name='science-instrument-enclosure';
    for(const x of [-.34,0,.34])box(instruments,[.23,.28,.21],[x,1.18,-1.31],'#536766');
    const frame=group('frame',new THREE.Vector3(-1.2,.5,-.75));
    const secondary:Point3=[0,mirrorY,1.62];
    for(const anchor of [[0,2.54,-.94],[-.91,.84,-.94],[.91,.84,-.94]] as Point3[]){const strut=detailRod(frame,anchor,secondary,.025,'#788784');strut.name='secondary-mirror-support-arm';}
    const secondaryHousing=mesh(frame,new THREE.CylinderGeometry(.155,.155,.08,32),DARK,[0,mirrorY,1.65]);secondaryHousing.rotation.x=Math.PI/2;
    const secondaryMirror=mesh(instruments,new THREE.CylinderGeometry(.139,.139,.012,32),'#d5af59',[0,mirrorY,1.603],true);secondaryMirror.rotation.x=Math.PI/2;secondaryMirror.name='round-secondary-mirror';
    for(const sign of [-1,1]){
      detailRod(frame,[sign*.84,.68,-1.05],[sign*.84,2.37,-1.05],.035,DARK);
      detailRod(frame,[sign*1.0,1.18,-1.05],[0,2.42,-1.05],.028,DARK);
      detailRod(frame,[sign*1.0,1.18,-1.05],[0,.62,-1.05],.028,DARK);
    }
    detailRod(frame,[0,-1.04,-.87],[0,.75,-.87],.105,'#bfc4b7');
    const shield=group('heatshield',new THREE.Vector3(0,-.65,.95));
    const perimeter:[number,number][]=[[0,-3.65],[1.73,-2.40],[2.69,-.10],[1.96,1.55],[0,4.40],[-1.96,1.55],[-2.69,-.10],[-1.73,-2.40]];
    const foilColors=['#ab8f84','#a6abb3','#b5b8c2','#c4c2c5','#d5d2cb'];
    for(let layer=0;layer<5;layer++){
      const scale=1-layer*.022,baseY=-.52+layer*.085;
      const outer=perimeter.map(([x,z]):Point3=>[x*scale,baseY+.02+layer*.025+(Math.abs(x)>2?.02:0),z*scale]);
      const inner=perimeter.map(([x,z]):Point3=>[x*scale*.32,baseY-.035,z*scale*.32]);
      const positions:number[]=[];const push=(a:Point3,b:Point3,c:Point3)=>positions.push(...a,...b,...c);
      for(let i=0;i<8;i++){const next=(i+1)%8;push([0,baseY-.035,0],inner[i],inner[next]);push(inner[i],outer[i],outer[next]);push(inner[i],outer[next],inner[next]);}
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.computeVertexNormals();
      const foil=mesh(shield,geo,foilColors[layer],[0,0,0],true);foil.name='sunshield-membrane-'+(layer+1);foil.userData.feature='sunshield-membrane';
      for(let i=0;i<8;i++)detailRod(shield,outer[i],outer[(i+1)%8],.007,foilColors[layer],true);
    }
    for(const tip of [[0,-.60,-3.65],[2.69,-.60,-.10],[0,-.60,4.40],[-2.69,-.60,-.10]] as Point3[])detailRod(frame,[0,-.62,-.30],tip,.028,'#7b8383');
    const body=group('body',new THREE.Vector3(0,-1.0,-.9));
    const bus=mesh(body,new THREE.CylinderGeometry(.68,.74,.61,8),GOLD,[0,-.99,-.63],true);bus.rotation.y=Math.PI/8;bus.name='warm-spacecraft-bus';
    for(const sign of [-1,1])box(body,[.035,.34,.61],[sign*.673,-.98,-.63],'#c9c9b9',true);
    box(body,[.56,.31,.46],[0,-.98,-.63],'#527179');
    for(const sign of [-1,1]){const thruster=mesh(body,new THREE.CylinderGeometry(.027,.075,.15,12),DARK,[sign*.53,-1.36,-.43]);thruster.name='platform-thruster-schematic';}
    const solarGroup=group('solar',new THREE.Vector3(1.15,-.55,0));
    box(solarGroup,[2.31,.028,.65],[1.85,-1.44,-.62],BLUE).name='single-deployed-solar-array';
    for(let j=0;j<=4;j++)box(solarGroup,[.016,.035,.66],[.695+j*2.31/4,-1.44,-.62],'#8ca7b0');
    for(let j=0;j<=3;j++)box(solarGroup,[2.31,.035,.008],[1.85,-1.44,-.945+j*.65/3],'#53758b');
    detailRod(solarGroup,[.54,-1.33,-.62],[.84,-1.44,-.62],.025);
    const ant=group('antenna',new THREE.Vector3(.8,-1.25,.7));
    detailRod(ant,[.42,-1.14,-.20],[.78,-1.54,.17],.025);
    const dishPoints=Array.from({length:11},(_,i)=>new THREE.Vector2(i*.026,.12*(i/10)**2));
    const dish=mesh(ant,new THREE.LatheGeometry(dishPoints,24),SILVER,[.78,-1.58,.17]);dish.rotation.z=Math.PI;dish.name='warm-side-communications-antenna';
  }else if(kind==='telescope'){
    const webb=/jwst|webb/.test(id);const body=group('body',new THREE.Vector3(-1.5,0,0));
    const instruments=group('instruments',new THREE.Vector3(1.3,.7,0));
    if(webb){for(let q=-2;q<=2;q++)for(let r=-2;r<=2;r++){if(Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r))>2||(!q&&!r))continue;const h=mesh(instruments,new THREE.CylinderGeometry(.265,.265,.05,6),GOLD,[Math.sqrt(3)*.275*(q+r/2),1.5*.275*r+.6,0]);h.rotation.x=Math.PI/2;}rod(instruments,new THREE.Vector3(0,1,0),new THREE.Vector3(0,1,1.3),.03);box(instruments,[.3,.25,.1],[0,1,1.3],SILVER);const shield=group('heatshield',new THREE.Vector3(0,-.8,1.2));for(let j=0;j<5;j++){const foil=box(shield,[3.4-j*.08,.015,2.1-j*.08],[0,-.75+j*.05,0],j%2?SILVER:'#879697',true);foil.rotation.y=Math.PI/4;}box(body,[.7,.5,.7],[0,-1.15,0],GOLD,true);}
    else {cylinder(body,.8,3.6,[0,0,0],SILVER,.8,true);cylinder(body,.82,.2,[0,1.85,0],DARK);const mirror=cylinder(instruments,.7,.12,[0,-1,0],'#94afbb');electronics(instruments,-1.4,8,.55);ring(body,.81,1.3);ring(body,.81,-1.3);}
    const sol=group('solar',new THREE.Vector3(1.6,0,1));if(!webb){solar(sol,-2.1,0,2.3,1);solar(sol,2.1,0,2.3,1);}else{solar(sol,1.7,-1.4,1.4,.9);rod(sol,new THREE.Vector3(.3,-1.4,0),new THREE.Vector3(1.1,-1.4,0),.025);}
    const av=group('avionics',new THREE.Vector3(0,-1.3,0));electronics(av,-1.1,5,.4);const ant=group('antenna',new THREE.Vector3(0,1.3,-1));antenna(ant,webb?-1.8:-1.5,.35,.4);const propulsion=group('propulsion',new THREE.Vector3(0,-1.8,0));engine(propulsion,.2,-1.8);
    const frame=group('frame',new THREE.Vector3(-1.1,0,1.4));rod(frame,new THREE.Vector3(0,-1,0),new THREE.Vector3(0,1,0),.07);
  }else if(id==='mariner-4'){
    // Eight-sided bus, four pinwheel solar wings, one scan-platform TV camera.
    const body=group('body',new THREE.Vector3(-1,0,0));
    mesh(body,new THREE.CylinderGeometry(.635,.635,.457,8),SILVER,[0,0,0],true).name='mariner-octagonal-bus';
    for(let i=0;i<8;i++){const a=(i+.5)*Math.PI/4;const panel=box(body,[.43,.31,.018],[.591*Math.sin(a),0,.591*Math.cos(a)],i%2?GOLD:'#64716f',true);panel.rotation.y=a;}
    const sol=group('solar',new THREE.Vector3(1.2,0,.6)),prop=group('propulsion',new THREE.Vector3(-.8,-.7,.5));
    for(let i=0;i<4;i++){
      const a=i*Math.PI/2,c=Math.cos(a),s=Math.sin(a),p=(r:number,t:number,y:number):Point3=>[c*r-s*t,y,s*r+c*t];
      const panel=box(sol,[1.76,.045,.90],p(1.58,.14,.25),BLUE,true);panel.rotation.y=-a;panel.name='mariner-solar-wing-'+(i+1);
      const vertices:number[]=[];
      const quad=(x1:number,z1:number,x2:number,z2:number)=>vertices.push(x1,0,z1,x2,0,z1,x2,0,z2,x1,0,z1,x2,0,z2,x1,0,z2);
      for(let k=0;k<=8;k++){const x=-.88+k*.22;quad(x-.006,-.45,x+.006,.45);}for(let k=0;k<=4;k++){const z=-.45+k*.225;quad(-.88,z-.006,.88,z+.006);}
      const grid=new THREE.BufferGeometry();grid.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));grid.computeVertexNormals();mesh(sol,grid,'#7696a3',p(1.58,.14,.275),true).rotation.y=-a;
      detailRod(sol,p(.48,.14,.22),p(2.48,.14,.22),.022,SILVER,true);detailRod(sol,p(2.46,.14,.25),p(3.06,.14,.25),.013,SILVER,true);
      face(sol,[p(2.91,-.18,.25),p(3.43,-.18,.25),p(3.43,.48,.25),p(2.91,.48,.25)],'#b8b6a4',true).name='mariner-solar-pressure-vane';
      for(const [j,direction] of [new THREE.Vector3(0,1,0),new THREE.Vector3(0,-1,0),new THREE.Vector3(-s,0,c)].entries()){
        const jet=mesh(prop,new THREE.CylinderGeometry(.025,.010,.07,8),DARK,p(2.38,-.22+j*.22,.23),true);jet.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction);
      }
    }
    const ant=group('antenna',new THREE.Vector3(0,1.1,0));
    const profile=Array.from({length:11},(_,i)=>new THREE.Vector2(.58*i/10,.16*(i/10)**2));
    mesh(ant,new THREE.LatheGeometry(profile,32),SILVER,[.10,.66,-.08],true).name='mariner-high-gain-dish';
    const rim=mesh(ant,new THREE.TorusGeometry(.58,.013,6,32),SILVER,[.10,.82,-.08],true);rim.rotation.x=Math.PI/2;
    for(let i=0;i<3;i++){const a=i*Math.PI*2/3;detailRod(ant,[.4*Math.cos(a),.23,.4*Math.sin(a)],[.10,.66,-.08],.014,SILVER,true);}
    detailRod(ant,[.10,.66,-.08],[.10,1.18,-.08],.012,DARK,true);mesh(ant,new THREE.CylinderGeometry(.045,.045,.09,12),GOLD,[.10,1.18,-.08],true);
    detailRod(ant,[-.48,.23,-.20],[-.48,2.24,-.20],.021,SILVER,true).name='mariner-low-gain-mast';mesh(ant,new THREE.CylinderGeometry(.055,.055,.045,12),SILVER,[-.48,2.25,-.20],true);
    const ins=group('instruments',new THREE.Vector3(0,-1,1));box(ins,[.13,.15,.13],[0,-.31,0],SILVER,true);
    box(ins,[.45,.13,.32],[0,-.44,0],GOLD,true).name='mariner-single-camera-scan-platform';
    const camera=mesh(ins,new THREE.CylinderGeometry(.11,.11,.32,12),SILVER,[.10,-.52,.19],true);camera.rotation.x=Math.PI/2;
    const lens=mesh(ins,new THREE.CylinderGeometry(.085,.085,.012,12),'#102e3b',[.10,-.52,.355],true);lens.rotation.x=Math.PI/2;
    box(ins,[.12,.15,.12],[-.48,1.72,-.20],DARK,true).name='mariner-magnetometer-on-mast';
    const nozzle=mesh(prop,new THREE.CylinderGeometry(.10,.035,.16,12),DARK,[.68,-.04,0],true);nozzle.rotation.z=-Math.PI/2;
    mesh(prop,new THREE.SphereGeometry(.20,12,8),GOLD,[.27,0,0]);
    const av=group('avionics',new THREE.Vector3(.8,.7,.6));for(let i=0;i<4;i++)box(av,[.20,.20,.19],[(i%2?1:-1)*.22,0,(i<2?1:-1)*.23],i%2?GREEN:DARK);
  }else if(id==='pioneer-10'){
    // Dish axis is +Y. Four SNAP-19 units on two booms; no solar wings.
    const body=group('body',new THREE.Vector3(0,-.8,0));
    mesh(body,new THREE.CylinderGeometry(.71,.71,.36,6),GOLD,[0,-.24,0],true).name='pioneer-hexagonal-bus';box(body,[.64,.36,.40],[0,-.24,-.72],GOLD,true).name='pioneer-science-compartment';
    const ant=group('antenna',new THREE.Vector3(0,1,0));
    const profile=Array.from({length:15},(_,i)=>new THREE.Vector2(1.37*i/14,.46*(i/14)**2));
    mesh(ant,new THREE.LatheGeometry(profile,40),'#d5d8cf',[0,.03,0],true).name='pioneer-high-gain-dish';
    const rim=mesh(ant,new THREE.TorusGeometry(1.37,.018,6,40),SILVER,[0,.49,0],true);rim.rotation.x=Math.PI/2;
    const feedY=.03+1.37*1.37/(4*.46);
    for(let i=0;i<3;i++){const a=i*Math.PI*2/3;detailRod(ant,[1.08*Math.cos(a),.315,1.08*Math.sin(a)],[0,feedY,0],.018,SILVER,true);}
    mesh(ant,new THREE.CylinderGeometry(.085,.085,.15,12),DARK,[0,feedY,0],true).name='pioneer-high-gain-feed';
    mesh(ant,new THREE.CylinderGeometry(.14,.075,.18,16),SILVER,[0,feedY+.15,0],true).name='pioneer-medium-gain-antenna';
    detailRod(ant,[.20,-.42,.15],[.20,-1.18,.15],.014,SILVER,true).name='pioneer-aft-low-gain-antenna';
    const service=group('service',new THREE.Vector3(1.2,-.4,.7));let rtgIndex=0;
    for(const a of [Math.PI/6,5*Math.PI/6]){
      const c=Math.cos(a),s=Math.sin(a),u=new THREE.Vector3(c,0,s),p=(r:number,t:number,y:number):Point3=>[c*r-s*t,y,s*r+c*t];
      for(const [t,y] of [[-.12,-.18],[.12,-.18],[0,-.43]])detailRod(service,p(.55,t,y),p(2.80,t*.35,-.28+(y+.18)*.35),.019,SILVER,true);
      for(const r of [2.84,3.19]){
        const center=new THREE.Vector3(...p(r,0,-.28)),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),u);
        const core=mesh(service,new THREE.CylinderGeometry(.15,.15,.30,12),DARK,center.toArray() as Point3,true);core.quaternion.copy(q);core.name='pioneer-SNAP-19-'+(++rtgIndex);
        for(let j=0;j<6;j++){
          const t=j*Math.PI/3,local:Point3[]=[[.13*Math.cos(t),-.15,.13*Math.sin(t)],[.28*Math.cos(t),-.15,.28*Math.sin(t)],[.28*Math.cos(t),.15,.28*Math.sin(t)],[.13*Math.cos(t),.15,.13*Math.sin(t)]];
          face(service,local.map(v=>new THREE.Vector3(...v).applyQuaternion(q).add(center).toArray() as Point3),'#a9b0aa',true);
        }
      }
    }
    const ins=group('instruments',new THREE.Vector3(0,0,-1.3));
    detailRod(ins,[0,-.24,-.83],[0,-.24,-6.60],.017,'#b5a56b',true).name='pioneer-independent-magnetometer-boom';
    const mag=mesh(ins,new THREE.CylinderGeometry(.075,.075,.22,10),GOLD,[0,-.24,-6.60],true);mag.rotation.x=Math.PI/2;
    box(ins,[.26,.17,.21],[.40,-.42,-.74],SILVER,true).name='pioneer-imaging-photopolarimeter';box(ins,[.15,.14,.17],[-.36,-.42,-.75],DARK,true);box(ins,[.29,.018,.27],[0,-.431,-.45],'#7f9294',true);
    const prop=group('propulsion',new THREE.Vector3(.7,.2,1));
    for(let i=0;i<3;i++){
      const a=i*Math.PI*2/3,center=new THREE.Vector3(Math.cos(a),0,Math.sin(a)).multiplyScalar(1.30);center.y=.38;
      for(const direction of [new THREE.Vector3(0,-1,0),new THREE.Vector3(-Math.sin(a),0,Math.cos(a))]){
        const jet=mesh(prop,new THREE.CylinderGeometry(.038,.015,.08,8),DARK,center.clone().addScaledVector(direction,.055).toArray() as Point3,true);jet.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction);
      }
    }
    const av=group('avionics',new THREE.Vector3(-.9,-.7,.3));for(let i=0;i<3;i++)box(av,[.23,.18,.22],[(i-1)*.25,-.24,0],i%2?GREEN:DARK);
    const frame=group('frame',new THREE.Vector3(0,-1.1,.5));
    const attachmentRing=mesh(frame,new THREE.TorusGeometry(.42,.027,6,24),SILVER,[0,-.45,0],true);attachmentRing.rotation.x=Math.PI/2;
    for(let i=0;i<3;i++){const a=i*Math.PI*2/3;detailRod(frame,[.43*Math.cos(a),-.43,.43*Math.sin(a)],[1.20*Math.cos(a),.38,1.20*Math.sin(a)],.017,SILVER,true);}
  }else{
    const body=group('body',new THREE.Vector3(-1.4,0,0));cylinder(body,.7,1.1,[0,0,0],GOLD,.7,true);const tank=group('tank',new THREE.Vector3(1.3,0,0));sphere(tank,.45,[0,0,0],SILVER);const av=group('avionics',new THREE.Vector3(0,1.3,0));electronics(av,.3,7,.5);
    const ant=group('antenna',new THREE.Vector3(0,1.8,0));antenna(ant,.65,/voyager|cassini|galileo/.test(id)?1.1:.75);const propulsion=group('propulsion',new THREE.Vector3(0,-1.5,0));engine(propulsion,.3,-.6);
    const ins=group('instruments',new THREE.Vector3(1.6,.8,0));rod(ins,new THREE.Vector3(.5,.1,0),new THREE.Vector3(2.2,.3,0),.025);box(ins,[.4,.3,.35],[2.2,.3,0],DARK);cylinder(ins,.2,.4,[-1.1,.1,0],GOLD);
    const frame=group('frame',new THREE.Vector3(0,0,1.3));cylinder(frame,.65,.08,[0,-.4,0],DARK);
    if(model.solarPanels){const sol=group('solar',new THREE.Vector3(1.4,-.5,1));const n=Math.max(2,Math.min(4,model.solarPanels));for(let i=0;i<n;i++){const a=i*Math.PI*2/n;const pg=new THREE.Group();sol.add(pg);pg.name='solar';solar(pg,2,0,2.6,.9);pg.rotation.y=a;}}
  }
  // Model-specific functional assemblies. Their placement remains illustrative.
  const has=(partId:string)=>parts.some(p=>p.id===partId);
  if(!reviewed){
  if(id==='electron'&&available.has('stage-3')&&!has('stage-3')){const kick=group('stage-3',new THREE.Vector3(0,1.8,0));cylinder(kick,.19,.18,[0,2.97,0],DARK);engine(kick,.09,2.87);}
  if(id==='starship'){
    const heat=group('heatshield',new THREE.Vector3(0,1,1.4)),r=model.diameter/model.height*4;
    mesh(heat,new THREE.CylinderGeometry(r*1.02,r*1.02,2.35,32,1,true,0,Math.PI),DARK,[0,1.9,0],true);
    for(const sign of [-1,1])for(const y of [1.05,3.2]){const flap=box(heat,[r*.9,.45,.04],[sign*r*1.2,y,0],DARK,true);flap.rotation.z=sign*.3;}
  }
  if(id==='slim'){
    const solarSurface=group('solar',new THREE.Vector3(0,.7,1));box(solarSurface,[1.65,.85,.035],[0,.4,.72],BLUE);
    for(let j=0;j<7;j++)box(solarSurface,[.01,.85,.04],[-.75+j*.25,.4,.72],'#547b97');
  }
  if(id==='chandrayaan-3'){
    const payload=group('payload',new THREE.Vector3(1.7,.6,.5));box(payload,[.55,.3,.45],[1.2,-.55,0],GOLD,true);
    for(const x of [.87,1.53])for(const z of [-.18,0,.18]){const wheel=cylinder(payload,.1,.08,[x,-.75,z],DARK);wheel.rotation.z=Math.PI/2;}
    const ramp=box(payload,[.7,.035,1.1],[1.15,-.4,-.7],SILVER);ramp.rotation.x=-.45;
  }
  if(kind==='lander'&&/^change-/.test(id)){
    if(id==='change-3'){
      const payload=group('payload',new THREE.Vector3(1.5,1.4,0));box(payload,[.75,.35,.55],[0,1.05,0],GOLD,true);
      for(const x of [-.45,.45])for(const z of [-.2,0,.2]){const wheel=cylinder(payload,.1,.1,[x,.85,z],DARK);wheel.rotation.z=Math.PI/2;}
    }else{
      const ascent=group('stage-2',new THREE.Vector3(0,1.8,0));box(ascent,[1.0,.65,.85],[0,1.25,0],GOLD,true);engine(ascent,.18,.9);
      const dock=group('docking',new THREE.Vector3(0,2.4,0));cylinder(dock,.23,.15,[0,1.67,0],DARK);
      if(available.has('heatshield')){const shield=group('heatshield',new THREE.Vector3(1.5,.3,0));cylinder(shield,.5,.1,[2.6,.2,0],DARK);cylinder(shield,.49,.6,[2.6,.55,0],SILVER,.22,true);}
    }
  }
  if(kind==='rocket'&&available.has('legs')){
    const legs=group('legs',new THREE.Vector3(1.8,-1,0));
    for(let i=0;i<4;i++){const a=i*Math.PI/2;rod(legs,new THREE.Vector3(Math.cos(a)*.3,-1.8,Math.sin(a)*.3),new THREE.Vector3(Math.cos(a)*1.4,-3.7,Math.sin(a)*1.4),.035);rod(legs,new THREE.Vector3(Math.cos(a)*.25,-2.9,Math.sin(a)*.25),new THREE.Vector3(Math.cos(a)*1.4,-3.7,Math.sin(a)*1.4),.025);}
  }
  if((kind==='station'||kind==='shuttle')&&available.has('propulsion')&&!has('propulsion')){
    const prop=group('propulsion',new THREE.Vector3(1.3,-1.5,.6));
    for(const side of [-1,1]){cylinder(prop,.18,.6,[side*.7,-1.9,0],SILVER);engine(prop,.15,-2.2,side*.7);}
  }
  if(kind==='probe'){
    if(available.has('service')&&!has('service')){
      const service=group('service',new THREE.Vector3(-1.6,-.7,0));
      if(/voyager|cassini|galileo|new-horizons/.test(id)){
        const count=id.includes('new-horizons')?1:id.includes('galileo')?2:3;
        for(let i=0;i<count;i++){const x=-1.15-i*.35;rod(service,new THREE.Vector3(-.45,-.3,0),new THREE.Vector3(x,-.3,0),.025);cylinder(service,.13,.6,[x,-.3,0],DARK);for(let j=0;j<6;j++){const fin=box(service,[.04,.65,.38],[x,-.3,0],SILVER);fin.rotation.y=j*Math.PI/3;}}
      }else{cylinder(service,.7,.65,[0,-.8,0],SILVER,.7,true);for(const x of [-.35,.35])engine(service,.15,-1.13,x);}
    }
    if(available.has('heatshield')&&!has('heatshield')){
      const shield=group('heatshield',new THREE.Vector3(0,2.5,0));cylinder(shield,id.includes('parker')?1:.85,.15,[0,1.45,0],SILVER,.85,true);cylinder(shield,.83,.05,[0,1.35,0],DARK);
    }
    if(available.has('payload')&&!has('payload')){
      const payload=group('payload',new THREE.Vector3(1.6,.3,1));
      if(/cassini|galileo/.test(id)){const shell=cylinder(payload,.45,.25,[.9,0,0],GOLD,.1,true);shell.rotation.z=Math.PI/2;}
      else if(id.includes('bepi')){cylinder(payload,.55,.8,[0,1.25,0],SILVER,.55,true);}
      else{box(payload,[.5,.45,.45],[.8,-.2,0],DARK,true);for(const sign of [-1,1])rod(payload,new THREE.Vector3(.8,-.4,0),new THREE.Vector3(.8+sign*.4,-.65,sign*.3),.02);}
    }
  }
  }
  // Every visible part maps to a documented dossier item; fallback is explicitly
  // classified as an illustrative structural grouping by the viewer.
  for(const p of parts){p.group.userData.documented=available.has(p.id);p.base.copy(p.group.position);}
  const bounds=new THREE.Box3().setFromObject(root),center=bounds.getCenter(new THREE.Vector3());
  root.position.sub(center);
  return {root,parts,meshes,materials};
}
