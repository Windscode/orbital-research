import * as THREE from 'three';
import type {ModelBuilderContext, Point3} from './modelTypes';

/** Individually selected launch configurations. Display geometry is not engineering CAD.
 * Only overall published envelopes and component counts constrain this model; tank
 * lengths, insulation thicknesses, ducts and attachment positions remain schematic. */
export function buildRocketModel(ctx: ModelBuilderContext): boolean {
  const {vehicle, model, available, mesh, box, cylinder, sphere, engine, detailRod, SILVER, DARK, GOLD} = ctx;
  if (model.kind !== 'rocket') return false;
  const known = ['falcon-9','falcon-heavy','electron','ariane-6','sls-block-1','saturn-v','starship','new-glenn','long-march-5','h3'];
  if (!known.includes(vehicle.id)) return false;
  const scale = 8 / model.height;
  const y = (metres: number) => metres * scale - 4;
  const v = (x: number, height: number, z = 0): Point3 => [x * scale, y(height), z * scale];
  const groups = new Map<string, THREE.Group>();
  const get = (id: string, direction: Point3 = [0,1,0]) => {
    let group = groups.get(id);
    if (!group) {
      if (!available.has(id)) throw new Error(`${vehicle.id}: undocumented rocket part ${id}`);
      group = ctx.group(id, new THREE.Vector3(...direction)); groups.set(id, group);
    }
    return group;
  };
  const exterior = (item: THREE.Mesh, name: string) => { item.name = name; item.userData.exteriorFeature = true; return item; };
  const tube = (g: THREE.Group, radius: number, bottom: number, top: number, color = SILVER, x = 0, z = 0, topRadius = radius) => {
    const body = mesh(g, new THREE.CylinderGeometry(topRadius * scale, radius * scale, (top-bottom) * scale, 64, 1, true), color, v(x,(bottom+top)/2,z), true);
    body.name = 'thin-exterior-shell';
    for (const [h,r] of [[bottom,radius],[top,topRadius]]) {
      const lip = mesh(g,new THREE.TorusGeometry(r*scale,.028*scale,6,64),color,v(x,h,z),true);lip.rotation.x=Math.PI/2;
    }
    return body;
  };
  const band = (g: THREE.Group, radius: number, bottom: number, top: number, color = DARK, x = 0, z = 0) => tube(g,radius+.015,bottom,top,color,x,z);
  const pipe = (g:THREE.Group, x:number, z:number, bottom:number, top:number, radius=.05, color=SILVER) => detailRod(g,v(x,bottom,z),v(x,top,z),radius*scale,color,true);
  const roundedTank = (g:THREE.Group,r:number,bottom:number,top:number,color:string,x=0,z=0) => {
    // These are functional tank envelopes, not surveyed bulkhead positions or volumes.
    const dome=Math.min(r*.42,(top-bottom)*.18), height=Math.max(.01,top-bottom-2*dome);
    cylinder(g,r*scale,height*scale,v(x,(top+bottom)/2,z),color);
    for (const h of [bottom+dome,top-dome]) sphere(g,r*scale,v(x,h,z),color).scale.y=dome/r;
  };
  const liquidPair = (g:THREE.Group,r:number,bottom:number,top:number,split=.5,x=0,z=0,hydrogen=false) => {
    const mid=bottom+(top-bottom)*split;
    roundedTank(g,r,bottom,mid-.10,hydrogen?'#b4cbd8':'#c7a065',x,z);
    roundedTank(g,r,mid+.10,top,'#799eaf',x,z);
    pipe(g,x+r*.7,z,bottom+.2,top-.2,.04,'#a2aeb9');
  };
  const bell = (g:THREE.Group,r:number,mount:number,x=0,z=0) => engine(g,r*scale,y(mount),x*scale,z*scale);
  const cluster = (g:THREE.Group,count:number,r:number,mount:number,spread:number,x=0,z=0) => {
    const center=[5,7,9].includes(count); const ringCount=center?count-1:count;
    if (count===1) { bell(g,r,mount,x,z);return; }
    for(let i=0;i<ringCount;i++) {const a=2*Math.PI*i/ringCount+(count===4?Math.PI/4:0);bell(g,r,mount,x+spread*Math.cos(a),z+spread*Math.sin(a));}
    if(center)bell(g,r,mount,x,z);
  };
  const fairing = (g:THREE.Group,r:number,bottom:number,cylinderTop:number,tip:number,color=SILVER,x=0,z=0) => {
    // Rounded-ogive outline; CAD surface and separation details are intentionally absent.
    tube(g,r,bottom,cylinderTop,color,x,z);
    const points=[];
    for(let i=0;i<=20;i++){const t=i/20;points.push(new THREE.Vector2(r*Math.cos(t*Math.PI/2)*scale,(cylinderTop+(tip-cylinderTop)*t)*scale));}
    const cap=mesh(g,new THREE.LatheGeometry(points,64),color,[x*scale,-4,z*scale],true);cap.name='ogive-fairing';
    for(const a of [0,Math.PI]) pipe(g,x+Math.sin(a)*r,z+Math.cos(a)*r,bottom,cylinderTop,.018,'#707d8a');
  };
  const strakes = (g:THREE.Group,r:number,bottom:number,top:number,count:number,width:number,color=DARK,x=0,z=0) => {
    for(let i=0;i<count;i++){
      const a=2*Math.PI*i/count, c=Math.cos(a),s=Math.sin(a);
      const points:Point3[]=[v(x+c*r,bottom,z+s*r),v(x+c*(r+width),bottom+.2,z+s*(r+width)),v(x+c*r,top,z+s*r)];
      const fin=ctx.face(g,points,color,true); fin.name='aerodynamic-strake';
    }
  };
  const gridFins = (g:THREE.Group,r:number,height:number,count:number,width:number,x=0,z=0,stowed=false) => {
    for(let i=0;i<count;i++){
      const a=2*Math.PI*i/count;
      const offset=stowed?.12:width*.45;
      const center=new THREE.Vector3((x+Math.cos(a)*(r+offset))*scale,y(height),(z+Math.sin(a)*(r+offset))*scale);
      const radial=stowed?new THREE.Vector3(0,1,0):new THREE.Vector3(Math.cos(a),0,Math.sin(a)),tangent=new THREE.Vector3(-Math.sin(a),0,Math.cos(a));
      const line=(u:number,w:number,du:number,dw:number)=>{
        const start=center.clone().addScaledVector(radial,u*scale).addScaledVector(tangent,w*scale);
        const end=start.clone().addScaledVector(radial,du*scale).addScaledVector(tangent,dw*scale);
        const rod=ctx.detailRod(g,start.toArray() as Point3,end.toArray() as Point3,.035*scale,DARK,true);rod.name='grid-fin-lattice';
      };
      for(let j=0;j<=6;j++){line(-width*.5,-width*.35+j*width*.7/6,width,0);line(-width*.5+j*width/6,-width*.35,0,width*.7);}
      line(-width*.9,0,width*.4,0);
    }
  };
  const stowedLegs = (g:THREE.Group,r:number,bottom:number,top:number,count:number,x=0,z=0) => {
    // All launch assemblies show folded gear; no impossible launch/landing hybrid.
    for(let i=0;i<count;i++){
      const a=2*Math.PI*i/count+Math.PI/4,c=Math.cos(a),s=Math.sin(a),t=.19;
      const points:Point3[]=[v(x+c*(r+.06)-s*t,bottom,z+s*(r+.06)+c*t),v(x+c*(r+.06)+s*t,bottom,z+s*(r+.06)-c*t),v(x+c*(r+.22),top,z+s*(r+.22))];
      exterior(ctx.face(g,points,DARK,true),'stowed-landing-leg');
      pipe(g,x+c*(r+.12),z+s*(r+.12),bottom,top,.035,SILVER);
    }
  };
  const battens = (g:THREE.Group,r:number,bottom:number,top:number,count=16,color=SILVER,x=0,z=0) => {
    for(let i=0;i<count;i++){const a=i*Math.PI*2/count;pipe(g,x+Math.cos(a)*r,z+Math.sin(a)*r,bottom,top,.025,color);}
  };
  const avionicRing=(g:THREE.Group,r:number,height:number)=>{
    for(let i=0;i<6;i++){const a=i*Math.PI/3;box(g,[r*.27*scale,r*.18*scale,r*.24*scale],v(Math.cos(a)*r*.66,height,Math.sin(a)*r*.66),i%2?GOLD:'#8aa8a2');}
    const deck=cylinder(g,r*scale,.06*scale,v(0,height-.15),DARK);deck.name='instrument-deck';
  };

  if (vehicle.id==='falcon-9'||vehicle.id==='falcon-heavy') {
    const heavy=vehicle.id==='falcon-heavy', r=1.85;
    const first=get('stage-1',[0,-1.1,0]);tube(first,r,1.0,41.7,'#e1e4e6');band(first,r,0.8,5.0);band(first,r,41.7,45.3);pipe(first,r*.72,r*.72,5.3,41.2,.07);
    gridFins(first,r,40.4,4,1.3,0,0,true);
    const upper=get('stage-2',[0,1.1,0]);tube(upper,r,45.3,56.8,'#e5e8e9');band(upper,r,45.3,46.2,'#9eaab3');bell(upper,1.35,45.6);cylinder(upper,1.23*scale,.3*scale,v(0,56.7),DARK);
    const engines=get('engine',[0,-2.0,0]);cluster(engines,9,.48,1.0,1.23);
    const tank=get('tank',[1.5,.1,0]);liquidPair(tank,r*.92,5.1,41.1,.40);liquidPair(tank,r*.90,47.0,55.8,.40);
    const fair=get('fairing',[-1.4,1.1,0]);tube(fair,r,56.8,57.4,'#e3e6e8',0,0,2.6);fairing(fair,2.6,57.4,63.3,70,'#e3e6e8');
    if (available.has('avionics')) avionicRing(get('avionics',[1.0,1.0,1.0]),r,55.9);
    if (available.has('legs'))stowedLegs(get('legs',[.8,-.5,.8]),r,2.0,14.3,4);
    if(heavy){const sides=get('boosters',[-1.5,-.5,0]);for(const side of [-1,1]){
      const x=side*4.25;tube(sides,r,1,41.7,'#e1e4e6',x);band(sides,r,.8,5,DARK,x);fairing(sides,r,41.7,42.0,45.5,'#d2d9dc',x);cluster(engines,9,.48,1,1.23,x);gridFins(sides,r,40.4,4,1.3,x,0,true);stowedLegs(sides,r,2,14.3,4,x);liquidPair(tank,r*.89,5.1,40.6,.4,x);
      for(const h of [8,34])detailRod(sides,v(side*r,h),v(x-side*r,h),.12*scale,DARK,true);
    }}
  } else if(vehicle.id==='electron') {
    const r=.6;
    const first=get('stage-1',[0,-1.1,0]);tube(first,r,.4,11.5,'#28313b');band(first,r,10.6,11.7,'#151d28');for(const z of [-r,r])pipe(first,0,z,.9,10.6,.02,'#5b6674');
    const engines=get('engine',[0,-2,0]);cluster(engines,9,.155,.40,.40);
    const upper=get('stage-2',[0,.8,0]);tube(upper,r,11.7,15.5,'#252e38');bell(upper,.42,11.6);for(const x of [-.27,.27])box(upper,[.24*scale,.38*scale,.20*scale],v(x,12.15),'#b1b9bc');
    const tanks=get('tank',[1.4,.15,0]);liquidPair(tanks,.54,1.2,10.7,.36);liquidPair(tanks,.53,12.5,15.15,.36);
    const kick=get('stage-3',[0,1.6,.4]);cylinder(kick,.52*scale,.20*scale,v(0,15.75),DARK);for(const x of [-.22,.22])sphere(kick,.13*scale,v(x,15.88),GOLD);bell(kick,.14,15.68);cylinder(kick,.49*scale,.09*scale,v(0,16.02),SILVER);
    const fair=get('fairing',[-1.4,1.0,0]);fairing(fair,r,15.5,16.55,18,'#ebeded');
  } else if(vehicle.id==='ariane-6') {
    const r=2.7;
    const first=get('stage-1',[0,-1.2,0]);tube(first,r,3,32,'#b8a77b');band(first,r,3,5.3,'#e7e8e2');band(first,r,27.5,32,'#e7e8e2');battens(first,r,3.5,5.2,24,'#ddd8c7');pipe(first,r*.82,r*.57,5.4,28,.09,'#c3bd9c');
    const engines=get('engine',[0,-2,0]);bell(engines,1.25,3.0);
    const upper=get('stage-2',[0,.85,0]);tube(upper,r,32,42,'#e4e6e2');band(upper,r,32,33.6,'#6b7178');bell(upper,1.1,33.6);
    const tanks=get('tank',[1.5,.1,0]);liquidPair(tanks,r*.9,5.4,29,.69,0,0,true);liquidPair(tanks,r*.88,35.6,41.2,.65,0,0,true);
    const fair=get('fairing',[-1.4,1.2,0]);fairing(fair,r,42,54,62,'#e7e9e7');
    const boosters=get('boosters',[-1.6,-.2,0]);for(let i=0;i<4;i++){
      const a=Math.PI/4+i*Math.PI/2,x=Math.cos(a)*4.52,z=Math.sin(a)*4.52,br=1.7;tube(boosters,br,2,16.9,'#e5e8e4',x,z);fairing(boosters,br,16.9,17.2,21.4,'#e5e8e4',x,z);bell(boosters,1.10,2,x,z);
      for(const h of [4.2,14.3])detailRod(boosters,v(Math.cos(a)*r,h,Math.sin(a)*r),v(x,h,z),.14*scale,DARK,true);
      cylinder(boosters,br*.82*scale,13.7*scale,v(x,9.7,z),'#a3937a');
    }
  } else if(vehicle.id==='sls-block-1') {
    const r=4.2;
    const first=get('stage-1',[0,-1.1,0]);tube(first,r,4.0,64.6,'#c58a48');band(first,r,4,8.5,'#b46d35');band(first,r,44.8,51.1,'#b87c3e');battens(first,r,45.0,51.0,28,'#d69c59');pipe(first,-r*.67,r*.75,6,57,.15,'#dcbd8e');
    const engines=get('engine',[0,-2,0]);cluster(engines,4,1.17,3.6,2.25);
    const tanks=get('tank',[1.7,0,0]);roundedTank(tanks,3.87,10,44.3,'#b9c9d3');roundedTank(tanks,3.87,51.1,62.7,'#8eafbc');pipe(tanks,3.3,0,8,60,.13,'#d5d9da');
    const upper=get('stage-2',[0,1,0]);tube(upper,r,64.6,71.9,'#d5d8d5',0,0,2.55);tube(upper,2.55,71.9,80.4,'#e1e2df');bell(upper,1.1,72);liquidPair(tanks,2.28,74,80,.67,0,0,true);band(upper,2.55,80.3,81.3,DARK);
    const payload=get('payload',[0,1.8,0]);tube(payload,2.55,81.3,85,'#eeeae1',0,0,2.5);tube(payload,2.5,85,87.0,'#c9cdd0');tube(payload,2.5,87,90.1,'#e3e6e6',0,0,.78);cylinder(payload,.18*scale,5.7*scale,v(0,93.1),'#d4d4cb');fairing(payload,.30,95.9,96.2,98.3,'#e7e4d9');
    for(const side of [-1,1])detailRod(payload,v(side*.7,90.0),v(side*.18,92.2),.06*scale,SILVER,true);
    const boosters=get('boosters',[-1.8,0,0]);for(const side of [-1,1]){
      const x=side*6.5,br=1.85;tube(boosters,br,3.1,46,'#eeeae2',x);fairing(boosters,br,46,46.3,54.2,'#ede9df',x);bell(boosters,1.43,3.1,x);
      for(let j=0;j<=5;j++)band(boosters,br,4+j*8.1,4.35+j*8.1,'#4b4f54',x);
      cylinder(boosters,br*.82*scale,40*scale,v(x,24),'#aa9d8a');
      for(const h of [8,45])detailRod(boosters,v(side*r,h),v(x-side*br,h),.19*scale,DARK,true);
    }
  } else if(vehicle.id==='saturn-v') {
    const r=5.03;
    const first=get('stage-1',[0,-1.3,0]);tube(first,r,4,42.1,'#e3e2d9');band(first,r,4.1,12.3,DARK);band(first,r,35.6,42.1,'#e4e4dc');
    // Roll-pattern sectors and corrugated skirts, no reproduced decals or marks.
    for(let i=0;i<4;i++){const a=i*Math.PI/2;const sector=mesh(first,new THREE.CylinderGeometry(r*scale*1.003,r*scale*1.003,7.5*scale,10,1,true,a,.44),DARK,v(0,36.7),true);sector.name='roll-pattern-sector';}
    battens(first,r,12.4,15.3,32,'#b8b9b5');battens(first,r,35.1,42.1,40,'#b7b9b6');strakes(first,r,4.2,10.5,4,3.2,SILVER);
    const engines=get('engine',[0,-2.2,0]);cluster(engines,5,1.8,4,3.25);
    const second=get('stage-2',[0,.7,0]);tube(second,r,42.1,67.0,'#e9e7dd');band(second,r,42.1,46.6,'#383f46');battens(second,r,42.3,46.4,36,'#777f81');cluster(second,5,.95,44.4,3.05);
    const third=get('stage-3',[0,1.4,0]);tube(third,r,67,72.1,'#e3e4dc',0,0,3.3);tube(third,3.3,72.1,84.9,'#e3e4dc');band(third,3.3,72.2,75.0,DARK);bell(third,1.05,72.7);
    const tank=get('tank',[1.6,.1,0]);liquidPair(tank,4.7,12.4,40.8,.40);liquidPair(tank,4.7,47.0,65.7,.76,0,0,true);liquidPair(tank,3.02,76.0,83.7,.69,0,0,true);
    const av=get('avionics',[1.1,1.2,1]);tube(av,3.3,84.9,85.8,DARK);avionicRing(av,3.0,85.3);
    const payload=get('payload',[0,2.0,0]);tube(payload,3.3,85.8,94.8,'#e4e4dc',0,0,1.95);tube(payload,1.95,94.8,101.4,'#d0d1c9');tube(payload,1.95,101.4,104.7,'#dfe3e1',0,0,.57);
    for(let i=0;i<4;i++){const a=i*Math.PI/2;pipe(payload,Math.cos(a)*.5,Math.sin(a)*.5,104.3,106,.07,DARK);}
    cylinder(payload,.25*scale,3.7*scale,v(0,108.0),'#d2d4ca');fairing(payload,.25,109.85,110,110.6,'#e1e2d9');
  } else if(vehicle.id==='starship') {
    const r=4.5;
    const first=get('stage-1',[0,-1.15,0]);tube(first,r,2.8,72,'#a7b4bd');for(let h=4;h<69;h+=3)band(first,r,h,h+.04,'#788b98');
    // V3 has three larger, lowered grid fins and an integrated hot-stage section.
    gridFins(first,r,63.0,3,4.8);tube(first,r,69.4,72,'#7c8c95');for(let i=0;i<12;i++){const a=i*Math.PI/6;const m=box(first,[.7*scale,1.7*scale,.06*scale],v(Math.sin(a)*(r+.02),70.65,Math.cos(a)*(r+.02)),DARK,true);m.rotation.y=a;}
    const engines=get('engine',[0,-2.1,0]);for(const [n,spread,offset] of [[3,.65,0],[10,2.12,.15],[20,3.70,0]])for(let i=0;i<n;i++){const a=i*Math.PI*2/n+offset;bell(engines,.48,2.8,Math.cos(a)*spread,Math.sin(a)*spread);}
    const ship=get('stage-2',[0,1.1,0]);tube(ship,r,72,111,'#a5b4c0');fairing(ship,r,111,111.1,124,'#a5b4c0');for(let h=75;h<111;h+=2.6)band(ship,r,h,h+.035,'#7e919e');
    for(let i=0;i<3;i++){const a=i*Math.PI*2/3;bell(ship,.68,74,Math.cos(a)*1.0,Math.sin(a)*1.0);bell(ship,1.2,74,Math.cos(a+Math.PI/3)*2.8,Math.sin(a+Math.PI/3)*2.8);}
    // Four flaps belong to Ship, rather than four generic booster wings.
    for(const side of [-1,1])for(const [bottom,top,width] of [[76,88,4.8],[109,117,2.8]]){
      const points:Point3[]=[v(side*r,bottom,.6),v(side*(r+width),bottom+1,.6),v(side*(r+width*.65),top-1,.6),v(side*r,top,.6)];exterior(ctx.face(ship,points,'#687c8a',true),'ship-body-flap');
    }
    const heat=get('heatshield',[0,.2,1.3]);const skin=mesh(heat,new THREE.CylinderGeometry(r*scale*1.008,r*scale*1.008,36.5*scale,36,1,true,-Math.PI/2,Math.PI), '#303d47',v(0,92.1),true);skin.name='windward-tps-sector';
    const noseProfile=[];for(let i=0;i<=16;i++){const t=i/16;noseProfile.push(new THREE.Vector2(r*1.008*Math.cos(t*Math.PI/2)*scale,(111.1+(124-111.1)*t)*scale));}const tpsNose=mesh(heat,new THREE.LatheGeometry(noseProfile,32,-Math.PI/2,Math.PI),'#303d47',[0, -4, 0],true);tpsNose.name='windward-nose-tps';
    const tank=get('tank',[1.6,0,0]);liquidPair(tank,4.15,7,67,.62);liquidPair(tank,4.1,78,103,.55);sphere(tank,1.2*scale,v(0,117),GOLD);
    const payload=get('payload',[-1.3,1.2,0]);cylinder(payload,3.9*scale,.22*scale,v(0,104.0),DARK);for(let i=0;i<3;i++){const tray=box(payload,[4.8*scale,.2*scale,3*scale],v(0,106+i*1.6),'#8b9eaa');tray.name='schematic-cargo-deck';}
    avionicRing(get('avionics',[1.0,1.2,.8]),2.4,114);
  } else if(vehicle.id==='new-glenn') {
    const r=3.5;
    const first=get('stage-1',[0,-1.1,0]);tube(first,r,3.4,57.0,'#e3e8e9');band(first,r,3.4,11.6,'#314d69');band(first,r,54,57,'#3b5268');pipe(first,-r*.78,r*.63,12,53,.13,'#91a2ad');
    strakes(first,r,5.6,22.0,4,2.8,'#405c77');
    for(let i=0;i<4;i++){const a=i*Math.PI/2,c=Math.cos(a),s=Math.sin(a);const points:Point3[]=[v(c*r,47.5,s*r),v(c*(r+2.4),48.0,s*(r+2.4)),v(c*(r+2.4),52.5,s*(r+2.4)),v(c*r,52.5,s*r)];exterior(ctx.face(first,points,'#d3dbe0',true),'actuated-aerodynamic-fin');}
    const eng=get('engine',[0,-2.0,0]);cluster(eng,7,1.0,3.4,2.25);
    const upper=get('stage-2',[0,.9,0]);tube(upper,r,57,77,'#e9eceb');bell(upper,1.35,59,-1.6);bell(upper,1.35,59,1.6);band(upper,r,57,60,'#8b9faa');
    const tanks=get('tank',[1.7,.1,0]);liquidPair(tanks,3.22,12,53,.40);liquidPair(tanks,3.22,63,75.8,.73,0,0,true);
    const fair=get('fairing',[-1.4,1.2,0]);fairing(fair,r,77,89,98,'#e4e9e9');
    stowedLegs(get('legs',[.9,-.3,.9]),r,4.8,15,6);
  } else if(vehicle.id==='long-march-5') {
    const r=2.5;
    const first=get('stage-1',[0,-1.1,0]);tube(first,r,3.2,31,'#e5e8e5');band(first,r,3.2,6,'#5b7a87');band(first,r,20.1,21.0,'#c8d4d5');battens(first,r,27,30.8,24,'#bac7c9');pipe(first,r*.72,r*.72,5.5,29,.10,'#97adb5');
    const engines=get('engine',[0,-2,0]);cluster(engines,2,.95,3.0,1.14);
    const upper=get('stage-2',[0,.95,0]);tube(upper,r,31,44.77,'#e6e8e5');band(upper,r,31,32.4,'#a1b6bc');cluster(upper,2,.83,32.0,1.0);
    const tanks=get('tank',[1.6,.1,0]);liquidPair(tanks,2.30,6.3,29.7,.69,0,0,true);liquidPair(tanks,2.28,34.6,44.1,.68,0,0,true);
    const fair=get('fairing',[-1.4,1.2,0]);fairing(fair,2.6,44.77,51.0,56.97,'#e8eae7');
    const boosters=get('boosters',[-1.7,-.3,0]);for(let i=0;i<4;i++){
      const a=i*Math.PI/2+Math.PI/4,x=Math.cos(a)*4.35,z=Math.sin(a)*4.35,br=1.675;
      tube(boosters,br,2.4,23,'#e0e6e3',x,z);band(boosters,br,2.4,5.0,'#617f89',x,z);fairing(boosters,br,23,23.5,27.5,'#e6e9e4',x,z);
      for(const sign of [-1,1])bell(boosters,.65,2.2,x+Math.cos(a+Math.PI/2)*sign*.72,z+Math.sin(a+Math.PI/2)*sign*.72);
      liquidPair(tanks,br*.9,5.6,22.4,.40,x,z);for(const h of [7,22])detailRod(boosters,v(Math.cos(a)*r,h,Math.sin(a)*r),v(x,h,z),.13*scale,DARK,true);
    }
  } else if(vehicle.id==='h3') {
    const r=2.6;
    const first=get('stage-1',[0,-1.1,0]);tube(first,r,3.0,36.6,'#b48a58');band(first,r,3,5.4,'#e3e5de');band(first,r,27.8,36.6,'#e1e4df');pipe(first,-r*.72,r*.70,5.5,33,.10,'#d5bd91');
    const engines=get('engine',[0,-2,0]);cluster(engines,2,1.05,2.9,1.23);
    const upper=get('stage-2',[0,.95,0]);tube(upper,r,36.6,46.4,'#e5e7e2');band(upper,r,36.6,38.1,'#686f72');bell(upper,1.15,38.4);
    const tanks=get('tank',[1.5,.1,0]);liquidPair(tanks,2.4,5.8,34.9,.72,0,0,true);liquidPair(tanks,2.34,40.2,45.6,.65,0,0,true);
    const fair=get('fairing',[-1.4,1.2,0]);fairing(fair,r,46.4,56,63,'#e5e8e4');
    const boosters=get('boosters',[-1.6,-.3,0]);for(let i=0;i<4;i++){
      const a=i*Math.PI/2+Math.PI/4,x=Math.cos(a)*4.0,z=Math.sin(a)*4.0,br=1.25;tube(boosters,br,1.8,13.4,'#e5e6df',x,z);fairing(boosters,br,13.4,14,17.0,'#e5e6df',x,z);bell(boosters,.83,1.8,x,z);
      cylinder(boosters,1.08*scale,10.5*scale,v(x,7.9,z),'#aa9d85');for(const h of [4,13])detailRod(boosters,v(Math.cos(a)*r,h,Math.sin(a)*r),v(x,h,z),.1*scale,DARK,true);
    }
  }

  // The model metadata is a strict contract: never invent an unlisted component.
  for(const part of model.parts) {
    if (!groups.has(part.id)) throw new Error(`${vehicle.id}: unbuilt rocket group ${part.id}`);
  }
  return true;
}
