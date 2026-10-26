import * as THREE from 'three';
import type {ModelBuilderContext, Point3} from './modelTypes';

/** Model-specific visual reconstructions. Exterior configurations are cited in
 * model-research-spacecraft-v8.json; interior shapes remain teaching geometry. */
export function buildSpacecraftModel(c:ModelBuilderContext):boolean {
  const id=c.vehicle.id;
  const handled=new Set(['sputnik-1','explorer-1','vostok-1','mercury','gemini','apollo-csm','soyuz','hubble','voyager-1','cassini','galileo','new-horizons','parker-solar-probe','rosetta','bepicolombo','juice','dragon-2','starliner','orion','shenzhou','tianzhou','tianwen-1','hayabusa2','mangalyaan']);
  if(!handled.has(id))return false;
  const {mesh,box,cylinder,sphere,detailRod,ring,engine,electronics,face,SILVER,DARK,GOLD,BLUE}=c;
  const WHITE='#e7e7df',BLACK='#20252e',COPPER='#ba8d52',GLASS='#527b99';
  const groups=new Map<string,THREE.Group>();
  const directions:Record<string,Point3>={body:[-1.4,0,0],crew:[0,1.7,0],service:[0,-1.5,0],solar:[1.3,0,1.2],antenna:[0,1.4,-.8],instruments:[1.3,.5,.5],avionics:[-.6,.5,1.3],propulsion:[0,-1.5,.9],payload:[1.3,-.2,1],heatshield:[0,-.5,-1.6],docking:[0,2.1,0],tank:[1.4,-.6,0],frame:[-.5,-1,1]};
  const part=(key:string)=>{let g=groups.get(key);if(!g){g=c.group(key,new THREE.Vector3(...(directions[key]||[1,1,0])));groups.set(key,g);}return g;};
  const rod=(g:THREE.Group,a:Point3,b:Point3,r=.02,color=SILVER,external=true)=>detailRod(g,a,b,r,color,external);
  const cyl=(g:THREE.Group,r:number,h:number,p:Point3,color=SILVER,rt=r,external=true)=>cylinder(g,r,h,p,color,rt,external);
  const drum=(g:THREE.Group,r:number,h:number,p:Point3,sides=12,color=GOLD)=>mesh(g,new THREE.CylinderGeometry(r,r,h,sides),color,p,true);
  const joint=(g:THREE.Group,p:Point3,r=.06)=>sphere(g,r,p,SILVER,true);
  function nozzle(g:THREE.Group,p:Point3,axis:Point3,r=.08){const m=mesh(g,new THREE.CylinderGeometry(r*.3,r,r*1.8,16,1,true),BLACK,p,true);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),new THREE.Vector3(...axis).normalize());return m;}
  function dish(g:THREE.Group,p:Point3,r:number,axis:Point3=[0,1,0],color=WHITE){
    const assembly=new THREE.Group();assembly.name=g.name;g.add(assembly);
    const profile=Array.from({length:17},(_,i)=>new THREE.Vector2(r*i/16,r*.24*(i/16)**2));
    mesh(assembly,new THREE.LatheGeometry(profile,48),color,[0,0,0],true).name='reflector';
    const edge=mesh(assembly,new THREE.TorusGeometry(r,.018,8,48),SILVER,[0,r*.24,0],true);edge.rotation.x=Math.PI/2;
    for(let i=0;i<3;i++){const a=i*Math.PI*2/3;rod(assembly,[Math.cos(a)*r*.85,r*.18,Math.sin(a)*r*.85],[0,r*.65,0],.018);}
    cyl(assembly,r*.06,r*.15,[0,r*.68,0],GOLD);assembly.position.set(...p);assembly.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(...axis).normalize());return assembly;
  }
  function panel(g:THREE.Group,p:Point3,w:number,h:number,angle=0){
    const assembly=new THREE.Group();assembly.name=g.name;g.add(assembly);assembly.position.set(...p);assembly.rotation.y=angle;
    box(assembly,[w,.045,h],[0,0,0],BLUE,true).name='photovoltaic-panel';
    for(let i=0;i<=8;i++)box(assembly,[.008,.052,h],[w*(i/8-.5),0,0],'#6d8ca5',true);
    for(let j=0;j<=4;j++)box(assembly,[w,.052,.008],[0,0,h*(j/4-.5)],'#6d8ca5',true);
    for(const s of [-1,1])box(assembly,[.025,.07,h],[s*w/2,-.025,0],SILVER,true);
    return assembly;
  }
  function wing(g:THREE.Group,sign:number,y:number,count:number,width:number,depth:number,start:number){
    rod(g,[sign*.65,y,0],[sign*start,y,0],.035);
    for(let i=0;i<count;i++){const x=sign*(start+width*(i+.5));panel(g,[x,y,0],width-.035,depth);joint(g,[sign*(start+width*i),y,0],.04);}
  }
  function rtg(g:THREE.Group,p:Point3,h:number,r:number,axis:Point3=[0,1,0]){
    const assembly=new THREE.Group();assembly.name=g.name;g.add(assembly);assembly.position.set(...p);assembly.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(...axis).normalize());
    cyl(assembly,r,h,[0,0,0],DARK);for(let i=0;i<8;i++){const a=i*Math.PI/4;const fin=box(assembly,[r*.8,h,.025],[Math.sin(a)*r*1.18,0,Math.cos(a)*r*1.18],SILVER,true);fin.rotation.y=a+Math.PI/2;}for(const y of [-h/2,h/2])cyl(assembly,r*1.05,.035,[0,y,0],SILVER);
  }
  function bay(g:THREE.Group,p:Point3,size:Point3,color=GOLD){box(g,size,p,color,false);for(let i=0;i<4;i++)box(g,[size[0]*.8,.012,.015],[p[0],p[1]-size[1]/2+i*size[1]/4,p[2]+size[2]/2+.006],SILVER,false);}
  function seats(g:THREE.Group,n:number,y:number,r=.4){for(let i=0;i<n;i++){const x=(i-(n-1)/2)*r;box(g,[r*.8,.12,.4],[x,y,.05],BLACK,false);const back=box(g,[r*.8,.5,.08],[x,y+.24,-.12],DARK,false);back.rotation.x=.3;}}
  function windows(g:THREE.Group,n:number,y:number,r:number){for(let i=0;i<n;i++){const a=(i-(n-1)/2)*.55;const m=box(g,[.18,.2,.025],[Math.sin(a)*r,y,Math.cos(a)*r],GLASS,true);m.rotation.y=a;}}
  function bottle(g:THREE.Group,p:Point3,r=.25,h=.6){cylinder(g,r,h,p,COPPER,r,false);sphere(g,r,[p[0],p[1]+h/2,p[2]],COPPER,false).scale.y=.55;sphere(g,r,[p[0],p[1]-h/2,p[2]],COPPER,false).scale.y=.55;}
  function thrusters(g:THREE.Group,r:number,y:number,n=4){for(let i=0;i<n;i++){const a=i*Math.PI*2/n;const p:Point3=[Math.sin(a)*r,y,Math.cos(a)*r];box(g,[.14,.16,.14],p,SILVER,true);nozzle(g,[p[0],y-.09,p[2]],[0,-1,0],.065);nozzle(g,[p[0]+Math.cos(a)*.1,y,p[2]-Math.sin(a)*.1],[Math.cos(a),0,-Math.sin(a)],.055);}}
  function hatch(g:THREE.Group,p:Point3,w=.42,h=.6){box(g,[w,h,.025],p,SILVER,true);box(g,[w*.7,h*.7,.035],[p[0],p[1],p[2]+.012],WHITE,true);box(g,[.14,.025,.05],[p[0]+w*.2,p[1],p[2]+.04],BLACK,true);}
  function ringAt(g:THREE.Group,r:number,p:Point3){const m=mesh(g,new THREE.TorusGeometry(r,.018,6,48),SILVER,p,true);m.rotation.x=Math.PI/2;return m;}
  if(id==='sputnik-1'){
    const b=part('body');sphere(b,.56,[0,0,0],SILVER,true);ringAt(b,.563,[0,0,0]);
    for(let i=0;i<12;i++){const a=i*Math.PI/6;joint(b,[Math.sin(a)*.563,0,Math.cos(a)*.563],.012);}
    const ant=part('antenna');for(let i=0;i<4;i++){const a=i*Math.PI/2, len=i%2?4.2:4.9;const base:Point3=[Math.cos(a)*.25,-.48,Math.sin(a)*.25];const tip:Point3=[Math.cos(a)*len*.48,-.48-len*.88,Math.sin(a)*len*.48];rod(ant,base,tip,.018);cyl(ant,.045,.12,base,WHITE);}
    const av=part('avionics');bay(av,[-.18,.08,0],[.25,.24,.28]);bay(av,[.18,.08,0],[.25,.24,.28]);
    const ins=part('instruments');sphere(ins,.07,[.22,.34,0],BLACK,false);rod(ins,[.22,.34,0],[0,.15,0],.008,GOLD,false);
    const svc=part('service');for(const x of [-.18,.18])bottle(svc,[x,-.2,0],.12,.24);cylinder(svc,.18,.04,[0,.32,0],DARK);
  } else if(id==='explorer-1'){
    const b=part('body');cyl(b,.235,5.25,[0,-.25,0],WHITE);cyl(b,.235,.65,[0,2.7,0],WHITE,.025);cyl(b,.238,.75,[0,-2.5,0],BLACK);
    for(let i=0;i<4;i++){const a=i*Math.PI/2;const m=box(b,[.18,1.4,.018],[Math.sin(a)*.235,.8,Math.cos(a)*.235],BLACK,true);m.rotation.y=a;}
    ringAt(b,.24,[0,.05,0]);ringAt(b,.24,[0,1.55,0]);
    const ant=part('antenna');for(let i=0;i<4;i++){const a=i*Math.PI/2;rod(ant,[Math.cos(a)*.2,.1,Math.sin(a)*.2],[Math.cos(a)*1.2,-.2,Math.sin(a)*1.2],.012);}
    const ins=part('instruments');cylinder(ins,.12,.65,[0,1.4,0],GOLD);box(ins,[.11,.1,.1],[0,1.9,0],DARK);
    const av=part('avionics');bay(av,[0,.1,0],[.28,.55,.25]);
    const svc=part('service');for(let i=0;i<5;i++)cylinder(svc,.17,.22,[0,-1.5+i*.28,0],COPPER);
  } else if(id==='vostok-1'){
    const crew=part('crew');sphere(crew,.95,[0,.65,0],SILVER,true);const h=cyl(crew,.33,.08,[0,.68,.89],WHITE);h.rotation.x=Math.PI/2;const w=cyl(crew,.12,.035,[.3,1.1,.79],GLASS);w.rotation.x=Math.PI/2;seats(crew,1,.4,.6);
    const heat=part('heatshield');mesh(heat,new THREE.SphereGeometry(.965,36,18,0,Math.PI*2,Math.PI*.65,Math.PI*.35),BLACK,[0,.65,0],true);
    const service=part('service');cyl(service,.72,.95,[0,-.98,0],SILVER,.38);cyl(service,.38,.5,[0,-1.7,0],SILVER,.65);for(let i=0;i<4;i++){const a=i*Math.PI/2;rod(service,[Math.sin(a)*.5,-.4,Math.cos(a)*.5],[Math.sin(a)*.8,-.88,Math.cos(a)*.8],.035);sphere(service,.19,[Math.sin(a)*.77,-.92,Math.cos(a)*.77],WHITE,true);}
    const prop=part('propulsion');engine(prop,.25,-1.95);bottle(prop,[0,-1.1,0],.28,.4);
    const av=part('avionics');electronics(av,-.8,4,.36);
  } else if(id==='mercury'){
    const crew=part('crew');cyl(crew,.86,1.5,[0,.2,0],BLACK,.28);for(let i=0;i<20;i++){const a=i*Math.PI/10;rod(crew,[Math.sin(a)*.865,-.55,Math.cos(a)*.865],[Math.sin(a)*.285,.95,Math.cos(a)*.285],.009,SILVER);}
    windows(crew,1,.56,.445);hatch(crew,[.05,-.08,.7],.35,.6);seats(crew,1,-.2,.6);
    const heat=part('heatshield');cyl(heat,.88,.12,[0,-.62,0],COPPER,.86);sphere(heat,.87,[0,-.61,0],BLACK,true).scale.y=.12;
    const svc=part('service');cyl(svc,.28,.7,[0,1.3,0],BLACK);ringAt(svc,.29,[0,1.55,0]);cyl(svc,.25,.08,[0,1.69,0],WHITE);
    const prop=part('propulsion');cyl(prop,.44,.13,[0,-.78,0],SILVER);for(let i=0;i<3;i++){const a=i*Math.PI*2/3;nozzle(prop,[Math.cos(a)*.25,-.88,Math.sin(a)*.25],[0,-1,0],.09);rod(prop,[Math.cos(a)*.44,-.8,Math.sin(a)*.44],[Math.cos(a)*.86,-.52,Math.sin(a)*.86],.02);}
    const av=part('avionics');bay(av,[0,.2,-.25],[.42,.32,.18]);
  } else if(id==='gemini'){
    const crew=part('crew');cyl(crew,.88,1.85,[0,.4,0],BLACK,.36);windows(crew,2,.87,.5);seats(crew,2,0,.55);
    for(let i=0;i<16;i++){const a=i*Math.PI/8;rod(crew,[Math.sin(a)*.885,-.525,Math.cos(a)*.885],[Math.sin(a)*.365,1.325,Math.cos(a)*.365],.01,SILVER);}
    const dock=part('docking');cyl(dock,.36,.56,[0,1.61,0],BLACK);ringAt(dock,.37,[0,1.9,0]);for(const x of [-.17,.17])rod(dock,[x,1.9,0],[x,2.13,0],.025);
    const service=part('service');cyl(service,1.05,1.3,[0,-1.25,0],WHITE,.88);for(let i=0;i<24;i++){const a=i*Math.PI/12;rod(service,[Math.sin(a)*1.05,-1.9,Math.cos(a)*1.05],[Math.sin(a)*.88,-.6,Math.cos(a)*.88],.01,SILVER);}
    const heat=part('heatshield');cyl(heat,.88,.11,[0,-.58,0],COPPER);
    const prop=part('propulsion');thrusters(prop,1.03,-1.7,4);for(const x of [-.35,.35])bottle(prop,[x,-1.3,0],.22,.5);
    const av=part('avionics');bay(av,[0,-.2,-.3],[.6,.35,.2]);
  } else if(id==='apollo-csm'){
    const crew=part('crew');cyl(crew,1,1.12,[0,1.26,0],SILVER,.18);windows(crew,3,1.42,.5);hatch(crew,[0,1.13,.7],.38,.4);seats(crew,3,.87,.4);
    const heat=part('heatshield');cyl(heat,1.015,.12,[0,.64,0],COPPER);
    const service=part('service');cyl(service,1,2.05,[0,-.45,0],SILVER);for(let i=0;i<6;i++){const a=i*Math.PI/3;const panel=box(service,[.55,1.1,.035],[Math.sin(a)*1.005,-.5,Math.cos(a)*1.005],WHITE,true);panel.rotation.y=a;}
    for(const x of [-.42,.42])bottle(service,[x,-.5,0],.3,1.05);
    const prop=part('propulsion');engine(prop,.55,-1.49);thrusters(prop,1.04,.23,4);
    const dock=part('docking');cyl(dock,.18,.2,[0,1.91,0],DARK);rod(dock,[0,2,0],[0,2.45,0],.04);for(let i=0;i<3;i++){const a=i*Math.PI*2/3;rod(dock,[0,2.42,0],[Math.sin(a)*.22,2.09,Math.cos(a)*.22],.015);}
    const ant=part('antenna');rod(ant,[.8,-.9,0],[1.45,-1.3,.15],.035);for(const x of [1.3,1.7])for(const z of [-.1,.3])dish(ant,[x,-1.3,z],.21,[.8,.3,.4],SILVER);
  } else if(id==='soyuz'||id==='shenzhou'){
    const sz=id==='shenzhou';const body=part('body');if(sz){cyl(body,.72,1.45,[0,1.68,0],GOLD);cyl(body,.72,.2,[0,2.5,0],GOLD,.43);hatch(body,[0,1.65,.73],.35,.65);}else{sphere(body,.75,[0,1.5,0],GOLD,true);cyl(body,.31,.2,[0,2.23,0],WHITE);}
    const crew=part('crew');cyl(crew,.81,1.1,[0,.15,0],GOLD,.64);sphere(crew,.8,[0,-.36,0],DARK,true).scale.y=.18;windows(crew,2,.24,.76);seats(crew,3,-.13,.36);
    const svc=part('service');cyl(svc,.75,1.05,[0,-1.1,0],WHITE,.66);cyl(svc,.92,.25,[0,-1.75,0],WHITE,.75);for(let i=0;i<12;i++){const a=i*Math.PI/6;rod(svc,[Math.sin(a)*.76,-1.6,Math.cos(a)*.76],[Math.sin(a)*.66,-.57,Math.cos(a)*.66],.015);}
    const sol=part('solar');for(const s of [-1,1])wing(sol,s,-1,sz?4:3,.7,1.28,1.05);
    const dock=part('docking');cyl(dock,.3,.19,[0,sz?2.7:2.45,0],DARK);rod(dock,[0,sz?2.8:2.55,0],[0,sz?3.1:2.87,0],.03);dish(dock,[.56,1.6,.4],.18,[.4,.3,1],WHITE);
    if(c.available.has('propulsion')){const prop=part('propulsion');engine(prop,.26,-1.9);thrusters(prop,.9,-1.7,4);}
    else{engine(svc,.26,-1.9);thrusters(svc,.9,-1.7,4);}
    if(c.available.has('heatshield'))cyl(part('heatshield'),.815,.1,[0,-.42,0],COPPER);
  } else if(id==='dragon-2'||id==='starliner'||id==='orion'){
    const dragon=id==='dragon-2',orion=id==='orion';const crew=part('crew');
    const profile=dragon?[[0,-.3],[.96,-.3],[.96,0],[.87,.7],[.58,1.35],[.32,1.62],[0,1.62]]:orion?[[0,-.3],[1.15,-.3],[1.13,-.1],[.48,1.03],[.27,1.12],[0,1.12]]:[[0,-.3],[1.1,-.3],[1.1,-.05],[.7,.9],[.39,1.16],[0,1.16]];
    mesh(crew,new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p as [number,number])),48),orion?SILVER:WHITE,[0,0,0],true);windows(crew,dragon?2:3,.67,dragon?.76:.82);hatch(crew,[0,.15,dragon?.96:1.04],.4,.56);seats(crew,dragon?4:3,.05,dragon?.32:.43);
    const shield=part('heatshield');cyl(shield,dragon?.97:orion?1.16:1.11,.14,[0,-.38,0],COPPER);sphere(shield,dragon?.97:1.12,[0,-.4,0],BLACK,true).scale.y=.1;
    const service=part('service');const height=dragon?1.75:orion?1.45:.8;const sy=-.5-height/2;cyl(service,dragon?.96:orion?.94:1.1,height,[0,sy,0],WHITE);
    if(dragon){for(let i=0;i<12;i++){const a=i*Math.PI/12+Math.PI/2;const p=box(service,[.23,1.4,.025],[Math.sin(a)*.968,sy,Math.cos(a)*.968],BLUE,true);p.rotation.y=a;}for(let i=0;i<4;i++){const a=i*Math.PI/2;const f=box(service,[.06,.9,.37],[Math.sin(a)*1.05,sy-.25,Math.cos(a)*1.05],WHITE,true);f.rotation.y=a;}}
    else if(!orion){cyl(service,1.05,.035,[0,sy-height/2-.02,0],BLUE);for(let i=0;i<8;i++){const a=i*Math.PI/4;rod(service,[0,sy-height/2-.045,0],[Math.cos(a),sy-height/2-.045,Math.sin(a)],.012,SILVER);} }
    else{for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4;const panelGroup=new THREE.Group();panelGroup.name='solar';part('solar').add(panelGroup);panelGroup.rotation.y=a;wing(panelGroup,1,-1.15,3,.72,.9,1.15);}for(const x of [-.38,.38])bottle(service,[x,sy,0],.27,.8);}
    const dock=part('docking');cyl(dock,dragon?.31:.29,.15,[0,dragon?1.7:1.22,0],DARK);ringAt(dock,.3,[0,dragon?1.79:1.31,0]);if(dragon){const cap=mesh(dock,new THREE.SphereGeometry(.34,28,14,0,Math.PI*2,0,Math.PI/2),WHITE,[0,1.8,-.62],true);cap.rotation.x=-1.2;rod(dock,[0,1.58,-.28],[0,1.74,-.62],.035);}
    const prop=part('propulsion');if(dragon){for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4;for(const d of [-.08,.08])nozzle(prop,[Math.sin(a)*.94+d,-.13,Math.cos(a)*.94],[Math.sin(a)*.3,-1,Math.cos(a)*.3],.075);}}
    else{thrusters(prop,orion?.98:1.12,sy,4);if(orion)engine(prop,.36,sy-height/2);}
    if(c.available.has('avionics'))bay(part('avionics'),[0,.2,-.38],[.55,.3,.25]);
  } else if(id==='tianzhou'){
    const payload=part('payload');cyl(payload,1.03,3.05,[0,.65,0],WHITE);cyl(payload,1.03,.4,[0,2.38,0],WHITE,.52);for(const y of [-.75,.15,1.05,1.95])ringAt(payload,1.04,[0,y,0]);for(const x of [-.55,.55])for(const y of [-.4,.4,1.2])bay(payload,[x,y,0],[.5,.6,.65]);
    const svc=part('service');cyl(svc,.83,1.35,[0,-1.65,0],GOLD);for(const x of [-.35,.35])engine(svc,.17,-2.34,x);thrusters(svc,.88,-1.9);
    const sol=part('solar');for(const s of [-1,1])wing(sol,s,-1.45,4,.85,1.5,1.05);
    const dock=part('docking');cyl(dock,.38,.24,[0,2.7,0],SILVER);ringAt(dock,.3,[0,2.83,0]);
    const tanks=part('tank');for(const x of [-.35,.35])bottle(tanks,[x,-1.58,0],.27,.65);
    const av=part('avionics');bay(av,[0,-1.05,.35],[.45,.2,.25]);
  } else if(id==='hubble'){
    const b=part('body');mesh(b,new THREE.CylinderGeometry(.69,.69,3.65,48,1,true),SILVER,[0,.4,0],true);cyl(b,.9,1.2,[0,-1.95,0],SILVER);for(const y of [-1.4,-.7,.3,1.3,2.22])ringAt(b,.7,[0,y,0]);const lid=cyl(b,.7,.045,[0,2.5,-.78],SILVER);lid.rotation.x=-.65;rod(b,[-.3,2.22,-.6],[-.3,2.6,-1],.025);rod(b,[.3,2.22,-.6],[.3,2.6,-1],.025);
    const ins=part('instruments');cyl(ins,.62,.07,[0,-1.14,0],GLASS);cyl(ins,.14,.08,[0,1.7,0],SILVER);for(let i=0;i<4;i++){const a=i*Math.PI/2;rod(ins,[Math.cos(a)*.64,1.72,Math.sin(a)*.64],[0,1.72,0],.012);}for(const x of [-.35,.35])bay(ins,[x,-1.9,0],[.5,.7,.55]);
    const sol=part('solar');for(const s of [-1,1])wing(sol,s,-.8,2,1.3,1.3,1.05);
    const ant=part('antenna');for(const s of [-1,1]){rod(ant,[0,-1.4,s*.8],[0,-.8,s*1.25],.035);dish(ant,[0,-.7,s*1.3],.32,[0,.2,s],WHITE);}
    const av=part('avionics');for(let i=0;i<4;i++){const a=i*Math.PI/2;bay(av,[Math.cos(a)*.55,-2.25,Math.sin(a)*.55],[.35,.3,.3]);}
    const f=part('frame');for(let i=0;i<4;i++){const a=i*Math.PI/2;rod(f,[Math.cos(a)*.6,-1.2,Math.sin(a)*.6],[Math.cos(a)*.6,1.8,Math.sin(a)*.6],.024,DARK,false);}
  } else if(id==='voyager-1'){
    drum(part('body'),.72,.42,[0,0,0],10,GOLD);dish(part('antenna'),[0,.3,0],1.4,[0,1,0],WHITE);
    const svc=part('service');rod(svc,[-.55,-.1,0],[-2.1,-.35,0],.035);for(let i=0;i<3;i++)rtg(svc,[-2.15-i*.42,-.35,0],.37,.14,[1,0,0]);
    const ins=part('instruments');rod(ins,[.6,-.05,0],[2.05,-.1,0],.035);box(ins,[.55,.22,.48],[2.15,-.02,0],DARK,true);for(const z of [-.13,.13]){const camera=cyl(ins,.11,.4,[2.25,-.02,z],BLACK);camera.rotation.z=Math.PI/2;}
    rod(ins,[0,-.1,-.6],[0,-.1,-4.8],.014);for(let j=0;j<12;j++){const z=-.6-j*.35;rod(ins,[-.055,-.1,z],[.055,-.1,z-.35],.009);rod(ins,[.055,-.1,z],[-.055,-.1,z-.35],.009);}joint(ins,[0,-.1,-4.8],.08);for(const s of [-1,1])rod(ins,[s*.5,-.2,.2],[s*2.1,-1.1,1.8],.012);
    const prop=part('propulsion');thrusters(prop,.72,-.2,3);
    const av=part('avionics');electronics(av,0,8,.48);const record=cyl(part('body'),.18,.018,[.7,-.05,0],GOLD);record.rotation.z=Math.PI/2;
  } else if(id==='cassini'){
    const b=part('body');drum(b,.67,2.8,[0,0,0],12,GOLD);for(const y of [-1,.2,1.1])ringAt(b,.7,[0,y,0]);dish(part('antenna'),[0,1.55,0],1.2,[0,1,0],WHITE);
    const svc=part('service');for(let i=0;i<3;i++){const a=i*Math.PI*2/3;const p:Point3=[Math.cos(a)*.95,-1.2,Math.sin(a)*.95];rod(svc,[Math.cos(a)*.6,-1,Math.sin(a)*.6],p,.035);rtg(svc,p,.8,.18);}
    const prop=part('propulsion');for(const x of [-.2,.2])engine(prop,.23,-1.45,x);for(const x of [-.3,.3])bottle(prop,[x,-.5,0],.22,1.2);
    const payload=part('payload');const h=mesh(payload,new THREE.CylinderGeometry(.65,.5,.3,36),COPPER,[.95,-.25,0],true);h.rotation.z=Math.PI/2;const cap=sphere(payload,.65,[1.11,-.25,0],GOLD,true);cap.scale.set(.15,1,1);rod(payload,[.55,-.6,0],[.95,-.25,0],.05);
    const ins=part('instruments');rod(ins,[.1,.7,-.6],[.1,.7,-4.1],.016);joint(ins,[.1,.7,-4.1],.08);box(ins,[.45,.5,.5],[-.85,.55,0],DARK,true);for(const y of [.35,.7]){const cam=cyl(ins,.13,.4,[-1.1,y,0],BLACK);cam.rotation.z=Math.PI/2;}for(const s of [-1,1])rod(ins,[0,-.2,.6],[s*1.7,-.4,2.5],.012);
  } else if(id==='galileo'){
    const b=part('body');drum(b,.67,1,[0,.25,0],12,GOLD);cyl(b,.48,1,[0,-.75,0],BLACK);ringAt(b,.5,[0,-.3,0]);
    const ant=part('antenna');cyl(ant,.25,.3,[0,1,0],SILVER);for(let i=0;i<18;i++){const a=i*Math.PI/9;const radius=[8,9,10].includes(i)?.22:.56;rod(ant,[Math.sin(a)*.22,.92,Math.cos(a)*.22],[Math.sin(a)*radius,2.15,Math.cos(a)*radius],.012,GOLD);}cyl(ant,.6,.035,[0,.86,0],WHITE);rod(ant,[0,2.1,0],[0,2.65,0],.018);joint(ant,[0,2.65,0],.05);
    const svc=part('service');for(const s of [-1,1]){rod(svc,[s*.55,.1,0],[s*1.8,.1,0],.035);rtg(svc,[s*2.08,.1,0],.78,.18,[1,0,0]);}
    const payload=part('payload');cyl(payload,.6,.28,[0,-1.55,0],COPPER,.42);sphere(payload,.6,[0,-1.67,0],COPPER,true).scale.y=.3;
    const ins=part('instruments');rod(ins,[0,.1,-.6],[0,.1,-3.5],.018);joint(ins,[0,.1,-3.5],.065);box(ins,[.5,.35,.4],[.68,-.9,.2],DARK,true);const cam=cyl(ins,.12,.45,[.83,-.9,.2],BLACK);cam.rotation.z=Math.PI/2;
    const prop=part('propulsion');for(const x of [-.35,.35])bottle(prop,[x,-.6,0],.2,.65);nozzle(prop,[0,-1.2,.45],[0,-1,.3],.2);thrusters(prop,.68,.3,2);
  } else if(id==='new-horizons'){
    const b=part('body');const base:Point3[]=[[-.75,-.4,-.6],[.75,-.4,-.6],[.9,-.4,.12],[.1,-.4,.78],[-.75,-.4,.55]];c.loft(b,[base,base.map(p=>[p[0],.35,p[2]] as Point3)],GOLD,true);dish(part('antenna'),[0,.5,0],.85,[0,1,0],WHITE);
    const svc=part('service');rod(svc,[-.65,0,0],[-1.25,0,0],.055);rtg(svc,[-1.6,0,0],.9,.24,[1,0,0]);
    const ins=part('instruments');const lorri=cyl(ins,.16,.65,[.6,0,.7],BLACK);lorri.rotation.x=Math.PI/2;box(ins,[.42,.3,.28],[.4,-.1,-.63],WHITE,true);box(ins,[.35,.4,.28],[-.3,.05,-.65],DARK,true);const sw=cyl(ins,.23,.13,[.83,-.02,0],SILVER);sw.rotation.z=Math.PI/2;
    const prop=part('propulsion');for(let i=0;i<4;i++){const a=i*Math.PI/2;nozzle(prop,[Math.sin(a)*.68,-.3,Math.cos(a)*.58],[Math.sin(a),-.3,Math.cos(a)],.055);}sphere(prop,.32,[0,-.03,0],SILVER,false);
    const av=part('avionics');bay(av,[-.3,.07,.3],[.38,.25,.3]);bay(av,[.3,.07,.1],[.4,.25,.3]);
  } else if(id==='parker-solar-probe'){
    const shield=part('heatshield');drum(shield,1.1,.18,[0,1.4,0],12,WHITE);drum(shield,1.08,.06,[0,1.27,0],12,BLACK);
    const b=part('body');drum(b,.52,1.65,[0,.1,0],6,GOLD);for(let i=0;i<6;i++){const a=i*Math.PI/3;rod(b,[Math.sin(a)*.45,.9,Math.cos(a)*.45],[Math.sin(a)*.8,1.28,Math.cos(a)*.8],.025);}
    const sol=part('solar');for(const s of [-1,1]){rod(sol,[s*.48,.25,0],[s*.78,.12,0],.035);const pg=panel(sol,[s*1.1,.05,0],.65,.65);pg.rotation.z=s*.28;}
    const ins=part('instruments');for(let i=0;i<4;i++){const a=i*Math.PI/2;rod(ins,[Math.sin(a)*.45,.8,Math.cos(a)*.45],[Math.sin(a)*1.52,1.5,Math.cos(a)*1.52],.014,GOLD);}rod(ins,[0,-.7,0],[0,-3.1,0],.02);joint(ins,[0,-3.1,0],.09);box(ins,[.3,.3,.35],[.5,-.22,0],BLACK,true);
    const ant=part('antenna');dish(ant,[0,-.9,0],.34,[0,-1,0],WHITE);nozzle(ant,[.35,-.7,0],[.7,-1,0],.07);
    const av=part('avionics');bay(av,[0,0,0],[.55,.45,.55]);
  } else if(id==='rosetta'){
    const b=part('body');box(b,[1.2,1.55,1.1],[0,0,0],GOLD,true);box(b,[1.22,.22,1.12],[0,.66,0],DARK,true);
    const sol=part('solar');for(const s of [-1,1])wing(sol,s,0,5,.85,1.55,.95);
    const ant=part('antenna');dish(ant,[0,.1,1.05],.62,[0,.15,1],WHITE);rod(ant,[0,-.2,.5],[0,.1,1.05],.045);
    const payload=part('payload');box(payload,[.55,.6,.5],[0,-.1,-.87],BLACK,true);for(let i=0;i<3;i++){const a=i*Math.PI*2/3;rod(payload,[0,-.38,-.87],[Math.sin(a)*.38,-.5,-.87+Math.cos(a)*.32],.02);}
    const prop=part('propulsion');thrusters(prop,.65,-.66,4);for(const x of [-.25,.25])bottle(prop,[x,-.1,0],.2,.65);
    const ins=part('instruments');for(const x of [-.3,.3]){box(ins,[.3,.23,.3],[x,.9,0],SILVER,true);cyl(ins,.09,.14,[x,1.07,0],BLACK);}rod(ins,[.4,.5,-.45],[.9,.75,-1.8],.015);joint(ins,[.9,.75,-1.8],.07);
  } else if(id==='bepicolombo'){
    const svc=part('service');box(svc,[1.5,1.3,1.4],[0,-1.35,0],WHITE,true);for(const x of [-.3,.3])for(const z of [-.3,.3]){const t=cyl(svc,.15,.06,[x,-2.03,z],DARK);t.name='ion-thruster';}
    const b=part('body');box(b,[1.48,1.4,1.34],[0,.1,0],WHITE,true);box(b,[1.52,1.28,.055],[0,.1,-.7],SILVER,true);for(let i=0;i<12;i++)box(b,[1.45,.02,.08],[0,-.5+i*.105,-.75],WHITE,true);
    const payload=part('payload');drum(payload,.62,.75,[0,1.22,0],8,WHITE);for(let i=0;i<8;i++){const a=i*Math.PI/4;const cell=box(payload,[.25,.65,.025],[Math.sin(a)*.61,1.22,Math.cos(a)*.61],BLUE,true);cell.rotation.y=a;}
    const shield=part('heatshield');mesh(shield,new THREE.CylinderGeometry(.8,.8,.95,16,1,true,0,Math.PI*1.6),SILVER,[0,1.22,0],true);cyl(shield,.79,.035,[0,1.72,0],WHITE);
    const sol=part('solar');for(const s of [-1,1])wing(sol,s,-1.3,3,1.15,1.25,1.1);
    const prop=part('propulsion');for(const x of [-.33,.33])bottle(prop,[x,-1.35,0],.25,.7);thrusters(prop,.74,.2,4);
  } else if(id==='juice'){
    const b=part('body');box(b,[1.5,1.8,1.4],[0,0,0],GOLD,true);box(b,[1.55,.4,1.45],[0,.7,0],BLACK,true);dish(part('antenna'),[0,1.2,0],.79,[0,1,0],WHITE);
    const sol=part('solar');for(const s of [-1,1]){rod(sol,[s*.7,0,0],[s*1.2,0,0],.04);for(let i=0;i<3;i++)panel(sol,[s*(1.85+i*1.25),0,0],1.2,1.2);for(const z of [-1.25,1.25])panel(sol,[s*3.1,0,z],1.2,1.2);}
    const ins=part('instruments');rod(ins,[0,.4,-.7],[0,.4,-4.2],.018);joint(ins,[0,.4,-4.2],.09);for(const s of [-1,1])rod(ins,[s*.6,-.6,0],[s*3,-.65,0],.014);for(const x of [-.4,.4])box(ins,[.32,.35,.3],[x,.25,.8],BLACK,true);
    const prop=part('propulsion');engine(prop,.28,-.92);for(const x of [-.32,.32])bottle(prop,[x,-.1,0],.28,.9);
    const f=part('frame');box(f,[1.3,.07,1.25],[0,-.75,0],SILVER,false);for(const x of [-.6,.6])rod(f,[x,-.75,-.55],[x,.75,.55],.03,DARK,false);
  } else if(id==='tianwen-1'){
    const b=part('body');drum(b,.8,1.8,[0,0,0],6,GOLD);cyl(b,.65,.3,[0,-1.04,0],SILVER);
    const sol=part('solar');for(const s of [-1,1])wing(sol,s,.1,3,.85,1.4,1.05);
    const ant=part('antenna');dish(ant,[0,.2,1.02],.83,[0,.2,1],WHITE);rod(ant,[0,-.4,.6],[0,.2,1.02],.045);
    const ins=part('instruments');for(const x of [-.35,.35]){cyl(ins,.12,.55,[x,-.83,.4],DARK);cyl(ins,.1,.03,[x,-1.12,.4],GLASS);}for(const s of [-1,1])rod(ins,[0,.5,s*.6],[0,.5,s*2.65],.014);rod(ins,[.5,.5,-.3],[1.3,1.7,-1.5],.014);joint(ins,[1.3,1.7,-1.5],.07);
    const prop=part('propulsion');engine(prop,.3,-1.2);sphere(prop,.4,[0,-.25,0],SILVER,false);
    const av=part('avionics');electronics(av,.45,6,.5);
  } else if(id==='hayabusa2'){
    const b=part('body');box(b,[1.2,.85,1.1],[0,0,0],GOLD,true);box(b,[1.24,.055,1.14],[0,.45,0],BLACK,true);
    const sol=part('solar');for(const s of [-1,1])wing(sol,s,.15,2,.82,1.05,.85);
    const ant=part('antenna');for(const x of [-.32,.32])cyl(ant,.3,.06,[x,.51,0],WHITE);rod(ant,[.4,.5,.4],[.4,.95,.4],.018);
    const prop=part('propulsion');for(const x of [-.19,.19])for(const y of [-.18,.18]){const ion=cyl(prop,.12,.06,[x,y,-.59],BLACK);ion.rotation.x=Math.PI/2;}sphere(prop,.25,[0,0,0],SILVER,false);
    const ins=part('instruments');cyl(ins,.12,.85,[.25,-.85,0],SILVER,.075);cyl(ins,.22,.16,[.25,-1.35,0],SILVER,.13);for(const x of [-.3,0,.3]){const cam=cyl(ins,.075,.12,[x,-.44,.4],BLACK);cam.rotation.x=Math.PI/2;}
    const payload=part('payload');const capsule=sphere(payload,.26,[-.35,.15,.57],COPPER,true);capsule.scale.z=.35;box(payload,[.3,.18,.25],[-.35,-.4,0],DARK,true);
  } else if(id==='mangalyaan'){
    const b=part('body');box(b,[1.1,1.25,1.15],[0,0,0],GOLD,true);box(b,[1.13,.15,1.18],[0,.6,0],WHITE,true);
    const sol=part('solar');wing(sol,1,0,3,.95,1.28,.85);
    const ant=part('antenna');dish(ant,[-.2,.85,0],.75,[0,1,0],WHITE);rod(ant,[-.5,.6,.2],[-.8,1.1,.5],.018);
    const prop=part('propulsion');engine(prop,.25,-.68);sphere(prop,.37,[0,-.1,0],SILVER,false);thrusters(prop,.61,-.5,4);
    const ins=part('instruments');for(const x of [-.3,.3]){box(ins,[.27,.3,.25],[x,-.5,.55],DARK,true);const camera=cyl(ins,.08,.15,[x,-.55,.74],BLACK);camera.rotation.x=Math.PI/2;}box(ins,[.22,.35,.25],[-.64,.2,0],WHITE,true);
    const av=part('avionics');bay(av,[0,.25,0],[.6,.25,.55]);
  }
  // Never create a generic, undocumented fallback component. A missing group is
  // a model-construction error caught by the source/geometry contract checks.
  return true;
}
