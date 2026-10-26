import * as THREE from 'three';
import type {ModelBuilderContext, Point3} from './modelTypes';

/** Documented configuration topology; dimensions and internal packages remain illustrative. */
export function buildSurfaceModel(c:ModelBuilderContext):boolean {
  const {vehicle,group,mesh,box,cylinder,sphere,detailRod,face,loft,engine,SILVER,DARK,GOLD,BLUE,GREEN}=c;
  const id=vehicle.id;
  if(!['space-shuttle','iss','mir','tiangong','zhurong','change-3','change-5','change-6','slim','chandrayaan-3'].includes(id))return false;
  const v=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
  const named=(m:THREE.Mesh,name:string)=>{m.name=name;return m;};
  const module=(g:THREE.Group,a:Point3,b:Point3,r:number,name:string,color=SILVER)=>{
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),d=end.clone().sub(start);
    const m=cylinder(g,r,d.length(),start.clone().add(end).multiplyScalar(.5).toArray() as Point3,color,r,true);
    m.quaternion.setFromUnitVectors(v(0,1,0),d.clone().normalize());m.name=name;
    for(const t of [.035,.965]){const p=start.clone().addScaledVector(d,t);const hoop=mesh(g,new THREE.TorusGeometry(r*1.005,.018,6,24),DARK,p.toArray() as Point3,true);hoop.quaternion.setFromUnitVectors(v(0,0,1),d.clone().normalize());}
    return m;
  };
  const disk=(g:THREE.Group,p:Point3,r:number,axis:Point3,color=DARK,name='docking-ring')=>{const d=cylinder(g,r,.09,p,color,r,true);d.quaternion.setFromUnitVectors(v(0,1,0),new THREE.Vector3(...axis).normalize());d.name=name;return d;};
  const panel=(g:THREE.Group,center:Point3,w:number,h:number,name:string,color=BLUE)=>{
    named(box(g,[w,.035,h],center,color,true),name);
    for(let i=0;i<=8;i++)box(g,[.007,.041,h],[center[0]-w/2+i*w/8,center[1],center[2]],'#7189a1',true);
    for(let j=0;j<=Math.max(2,Math.round(h*3));j++){const n=Math.max(2,Math.round(h*3));box(g,[w,.041,.007],[center[0],center[1],center[2]-h/2+j*h/n],'#7189a1',true);}
  };
  const dish=(g:THREE.Group,p:Point3,r:number,axis:Point3,name:string)=>{
    const points=Array.from({length:13},(_,i)=>new THREE.Vector2(r*i/12,.24*r*(i/12)**2));
    const d=mesh(g,new THREE.LatheGeometry(points,32),SILVER,p,true);d.quaternion.setFromUnitVectors(v(0,1,0),new THREE.Vector3(...axis).normalize());d.name=name;
    const end=new THREE.Vector3(...p).addScaledVector(new THREE.Vector3(...axis).normalize(),r*.55);
    detailRod(g,p,end.toArray() as Point3,.014,DARK,true);sphere(g,.03,end.toArray() as Point3,GOLD,true);
  };
  const legs4=(g:THREE.Group,spread=1.7,deckY=.25)=>{
    for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2,cos=Math.cos(a),sin=Math.sin(a);const foot:Point3=[cos*spread,-.9,sin*spread];
      named(detailRod(g,[cos*.8,deckY,sin*.8],foot,.052,'#cdbb91',true),'landing-leg-'+(i+1));
      for(const offset of [-.22,.22])detailRod(g,[cos*.65-sin*offset,-.05,sin*.65+cos*offset],foot,.023,SILVER,true);
      named(cylinder(g,.23,.055,foot,SILVER,.19,true),'landing-footpad-'+(i+1));
    }
  };
  const camera=(g:THREE.Group,p:Point3,r=.065)=>{const m=cylinder(g,r,.11,p,DARK);m.rotation.x=Math.PI/2;const lens=disk(g,[p[0],p[1],p[2]+.07],r*.7,[0,0,1],'#759db6','camera-aperture');lens.scale.y=.3;};

  if(id==='iss'){
    // 2011 major assembly topology: eight legacy SAWs, each with two blankets.
    const body=group('body',v(0,.7,0));
    module(body,[0,0,-3.0],[0,0,-1.85],.24,'Zvezda-service-module');
    module(body,[0,0,-1.75],[0,0,-.8],.30,'Zarya-functional-cargo-block','#b4c3ba');
    module(body,[0,0,-.7],[0,0,-.05],.30,'Unity-node');
    module(body,[0,0,.05],[0,0,1.15],.33,'Destiny-laboratory');
    module(body,[0,0,1.25],[0,0,1.8],.32,'Harmony-node');
    module(body,[-.35,0,1.48],[-1.5,0,1.48],.31,'Kibo-pressurized-module');
    module(body,[.35,0,1.48],[1.25,0,1.48],.27,'Columbus-laboratory');
    module(body,[.35,0,-.38],[1.25,0,-.38],.29,'Tranquility-node');
    module(body,[1,0,-.38],[1,-.35,-.38],.17,'Cupola');
    module(body,[-.32,0,-.38],[-.85,0,-.38],.23,'Quest-airlock');
    const frame=group('frame',v(0,1.35,0));
    for(let i=-10;i<=10;i++){const x=i*.48;for(const y of [.48,.78])for(const z of [-.17,.17])if(i<10)detailRod(frame,[x,y,z],[x+.48,y,z],.025,SILVER,true);
      for(const z of [-.17,.17]){detailRod(frame,[x,.48,z],[x,.78,z],.018,SILVER,true);if(i<10)detailRod(frame,[x,.48,z],[x+.48,.78,z],.016,SILVER,true);}}
    for(const x of [-1.6,1.6])for(let j=0;j<3;j++){const radiator=box(frame,[.43,.025,1.8],[x+(j-1)*.48,.52,-1.35],'#e4e9e6',true);radiator.rotation.z=x<0?-.22:.22;radiator.name='thermal-control-radiator';}
    const solar=group('solar',v(0,0,1.4));
    for(const x of [-4.25,-2.95,2.95,4.25])for(const sign of [-1,1]){
      const z=sign*1.95;detailRod(solar,[x,.64,sign*.20],[x,.64,sign*3.65],.022,GOLD,true).name='legacy-solar-array-mast';
      for(const side of [-1,1])panel(solar,[x+side*.24,.65,z],.43,3.1,'legacy-solar-blanket','#8c633f');
    }
    const docking=group('docking',v(0,-.65,1));
    disk(docking,[0,0,1.94],.21,[0,0,1],DARK,'forward-pressurized-mating-adapter');
    disk(docking,[0,0,-3.12],.17,[0,0,1],DARK,'aft-russian-docking-port');
    module(docking,[0,-.25,-1.15],[0,-.65,-1.15],.13,'nadir-docking-module');
    const ins=group('instruments',v(-1.1,.7,0));
    box(ins,[.7,.09,.72],[-1.85,0,1.48],SILVER,true).name='Kibo-exposed-facility';
    box(ins,[.5,.4,.45],[-1.1,.84,-.05],GOLD,true).name='external-experiment-package';
    for(const [a,b] of [[[.2,.35,.7],[.8,1.4,.65]],[[.8,1.4,.65],[1.6,1.2,1.25]],[[1.6,1.2,1.25],[1.9,.7,1.6]]] as [Point3,Point3][]){detailRod(ins,a,b,.045,SILVER,true);sphere(ins,.075,b,DARK,true);}
    const crew=group('crew',v(0,-1.2,0));
    for(const z of [-2.5,-1.2,.35,.85]){box(crew,[.15,.32,.25],[-.13,0,z],GREEN);box(crew,[.15,.32,.25],[.13,0,z],GOLD);}return true;
  }
  if(id==='mir'){
    const body=group('body',v(0,0,1));
    module(body,[0,0,-1.9],[0,0,.55],.4,'Mir-core-module');
    module(body,[0,0,-2.8],[0,0,-2.02],.35,'Kvant-1-module');
    const dock=group('docking',v(0,1,0));sphere(dock,.43,[0,0,.85],SILVER,true).name='Mir-six-port-transfer-node';
    disk(dock,[0,0,1.32],.21,[0,0,1]);disk(dock,[0,0,-2.94],.2,[0,0,1]);
    module(dock,[-2.15,0,.85],[-2.8,0,.85],.22,'shuttle-docking-module','#b77b43');
    const ins=group('instruments',v(1,.6,0));
    module(ins,[-.45,0,.85],[-2.05,0,.85],.32,'Kristall-module');
    module(ins,[.45,0,.85],[2.15,0,.85],.31,'Priroda-module');
    module(ins,[0,.45,.85],[0,1.95,.85],.31,'Kvant-2-module');
    module(ins,[0,-.45,.85],[0,-1.95,.85],.31,'Spektr-module');
    box(ins,[.46,.45,.06],[2.16,0,1.20],SILVER,true).name='Priroda-radar-experiment-schematic';
    const solar=group('solar',v(0,0,-1.3));
    for(const side of [-1,1]){detailRod(solar,[side*.4,0,-.9],[side*2.1,0,-.9],.025);panel(solar,[side*1.65,0,-.9],2.3,.75,'core-module-solar-array');
      panel(solar,[side*.9,1.6,.85],1.1,.62,'Kvant-2-solar-array');
      panel(solar,[side*.8,-1.6,.85],.95,.7,'Spektr-solar-array');
      panel(solar,[side*.8,-1.5,1.65],.95,.7,'Spektr-solar-array');
    }
    const prop=group('propulsion',v(0,-1,-.6));for(const side of [-1,1]){const e=cylinder(prop,.10,.25,[side*.24,0,-2.94],DARK,.05);e.rotation.x=Math.PI/2;e.name='aft-thruster-schematic';}
    const crew=group('crew',v(-1,-.6,0));for(const z of [-1.4,-.7,0]){box(crew,[.2,.42,.35],[-.18,0,z],GREEN);box(crew,[.2,.35,.35],[.18,0,z],GOLD);}return true;
  }
  if(id==='tiangong'){
    const body=group('body',v(0,0,1));
    module(body,[0,0,.35],[0,0,2.35],.37,'Tianhe-large-diameter-section');
    module(body,[0,0,2.35],[0,0,2.95],.27,'Tianhe-resource-section');
    sphere(body,.39,[0,0,0],SILVER,true).name='Tianhe-node';
    const ins=group('instruments',v(0,.9,0));
    for(const side of [-1,1]){module(ins,[side*.4,0,0],[side*2.4,0,0],.35,side<0?'Wentian-laboratory':'Mengtian-laboratory');module(ins,[side*2.4,0,0],[side*3.1,0,0],.25,side<0?'Wentian-airlock-resource-end':'Mengtian-cargo-airlock-end');box(ins,[.5,.06,.55],[side*1.8,-.36,0],DARK,true).name='external-payload-platform';}
    const solar=group('solar',v(0,0,-1.3));
    for(const x of [-3.1,3.1])for(const side of [-1,1]){detailRod(solar,[x,0,0],[x,0,side*3],.022,GOLD);panel(solar,[x,0,side*1.8],.85,2.8,'laboratory-flexible-solar-wing');}
    for(const side of [-1,1]){detailRod(solar,[side*.25,0,2.6],[side*1.1,0,2.6],.02);panel(solar,[side*1.5,0,2.6],1.7,.62,'Tianhe-original-solar-wing-2022');}
    const dock=group('docking',v(0,-.7,-.7));disk(dock,[0,0,-.47],.22,[0,0,1],DARK,'forward-docking-port');disk(dock,[0,0,3.1],.19,[0,0,1],DARK,'aft-cargo-docking-port');disk(dock,[0,-.44,0],.21,[0,1,0],DARK,'radial-crew-docking-port');
    const prop=group('propulsion',v(.7,-.8,1));for(const x of [-.22,.22]){const e=cylinder(prop,.08,.18,[x,0,3.0],DARK,.04);e.rotation.x=Math.PI/2;e.name='orbit-thruster-schematic';}for(const x of [-.28,.28])disk(prop,[x,-.21,2.65],.045,[0,-1,0],'#7c91a8','electric-thruster-functional-marker');
    const frame=group('frame',v(-1,.8,0));for(const [a,b] of [[[.36,.15,1.45],[.7,1,1.0]],[[.7,1,1.0],[1.5,1,.7]],[[1.5,1,.7],[1.8,.45,.35]]] as [Point3,Point3][]){detailRod(frame,a,b,.047,SILVER,true);sphere(frame,.075,b,DARK,true);}return true;
  }
  if(id==='space-shuttle'){
    // Orbiter only, orbit configuration with open doors, +Z nose and +Y dorsal.
    const frame=group('frame',v(1.4,0,0));
    const sections:[number,number,number,number][]=[[-2.8,.58,-.24,.61],[-1.9,.62,-.26,.65],[1.25,.53,-.20,.61],[2.1,.43,-.15,.73],[2.8,.22,-.13,.42],[3.1,.04,-.04,.10]];
    const shell=sections.map(([z,w,b,t])=>[[-w,b,z],[w,b,z],[w,t*.42,z],[w*.70,t,z],[-w*.70,t,z],[-w,t*.42,z]] as Point3[]);
    // Sidewalls are separate from payload bay; cutting them reveals interior racks.
    loft(frame,[shell[0],shell[1]],'#e2e5dc',true).name='orbiter-aft-fuselage';
    loft(frame,shell.slice(2),'#e2e5dc',true).name='orbiter-forward-fuselage';
    for(const s of [-1,1])face(frame,[[s*.62,-.26,-1.9],[s*.53,-.20,1.25],[s*.53,.53,1.25],[s*.62,.55,-1.9]],'#e2e5dc',true).name='open-bay-sidewall';
    for(const s of [-1,1]){
      const wing:Point3[]=[[s*.50,-.17,1.0],[s*2.35,-.20,-2.4],[s*.50,-.19,-2.65]];
      face(frame,wing,'#e4e6df',true).name='double-delta-wing';
      face(frame,[[s*.50,-.16,1.0],[s*1.02,-.18,.2],[s*2.35,-.19,-2.4],[s*2.23,-.19,-2.36]],DARK,true).name='reinforced-carbon-leading-edge';
      detailRod(frame,[s*.7,-.18,-2.31],[s*2.12,-.18,-2.31],.016,DARK,true).name='elevon-hinge-line';
    }
    face(frame,[[-.035,.5,-2.75],[-.035,1.94,-2.5],[-.035,1.46,-1.22],[-.035,.55,-.95]],'#e2e5dc',true).name='vertical-stabilizer';
    face(frame,[[.035,.5,-2.75],[.035,1.94,-2.5],[.035,1.46,-1.22],[.035,.55,-.95]],'#e2e5dc',true);
    detailRod(frame,[0,1.89,-2.49],[0,.64,-2.74],.024,DARK,true).name='rudder-speed-brake-seam';
    const heat=group('heatshield',v(0,-1.1,0));
    loft(heat,sections.map(([z,w,b])=>[[-w,b-.018,z],[w,b-.018,z],[w*.85,b-.07,z],[-w*.85,b-.07,z]] as Point3[]),DARK,true).name='orbiter-belly-thermal-protection';
    for(const s of [-1,1])face(heat,[[s*.5,-.214,.95],[s*2.35,-.23,-2.4],[s*.5,-.24,-2.65]],DARK,true);
    const crew=group('crew',v(0,1.3,1.1));
    box(crew,[.60,.36,.73],[0,.30,1.82],GREEN).name='flight-deck-functional-volume';
    for(const x of [-.22,.22]){face(crew,[[x-.12,.72,1.93],[x+.12,.72,1.93],[x+.09,.53,2.28],[x-.09,.53,2.28]],'#173644',true).name='cockpit-forward-window';box(crew,[.16,.16,.24],[x,.41,1.98],DARK);}
    box(crew,[.55,.21,.7],[0,.01,1.8],GOLD).name='middeck-functional-volume';
    const payload=group('payload',v(0,1.5,0));
    box(payload,[1.04,.10,2.9],[0,.25,-.4],DARK).name='payload-bay-floor';
    for(const s of [-1,1]){const door=box(payload,[.66,.035,3.0],[s*.92,.75,-.35],'#e1e8e3',true);door.rotation.z=-s*.42;door.name='open-payload-bay-door';for(let j=0;j<7;j++)box(payload,[.58,.04,.018],[s*.92,.79,-1.70+j*.45],SILVER,true);}
    for(const z of [-1.5,-.75,0,.75]){detailRod(payload,[-.49,.28,z],[.49,.28,z],.025,SILVER);}
    box(payload,[.65,.60,.85],[0,.60,-.45],GOLD).name='illustrative-payload-envelope';
    const main=group('engine',v(0,0,-1.6));
    for(const p of [[-.29,.12,-2.9],[.29,.12,-2.9],[0,.58,-2.9]] as Point3[]){const points=[new THREE.Vector2(.08,0),new THREE.Vector2(.07,-.10),new THREE.Vector2(.12,-.22),new THREE.Vector2(.23,-.43)];const m=mesh(main,new THREE.LatheGeometry(points,32),DARK,p);m.rotation.x=Math.PI/2;m.name='space-shuttle-main-engine';}
    const prop=group('propulsion',v(1.1,.9,-.5));
    for(const s of [-1,1]){box(prop,[.30,.32,.9],[s*.52,.57,-2.28],SILVER,true).name='OMS-RCS-pod';const nozzle=mesh(prop,new THREE.CylinderGeometry(.12,.05,.25,20),DARK,[s*.52,.58,-2.85]);nozzle.rotation.x=-Math.PI/2;nozzle.name='OMS-engine';for(const z of [-2.1,-2.45])disk(prop,[s*.68,.59,z],.038,[s,0,0],DARK,'RCS-aperture');}
    return true;
  }
  if(id==='zhurong'){
    const body=group('body',v(0,.85,0));
    box(body,[1.25,.55,1.55],[0,.15,0],GOLD,true).name='Zhurong-gold-body';
    loft(body,[[[-.60,.43,-.9],[.60,.43,-.9],[.78,.43,-.65],[.78,.43,.65],[.6,.43,.92],[-.6,.43,.92],[-.78,.43,.65],[-.78,.43,-.65]], [[-.60,.50,-.9],[.60,.50,-.9],[.78,.50,-.65],[.78,.50,.65],[.6,.50,.92],[-.6,.50,.92],[-.78,.50,.65],[-.78,.50,-.65]]],GOLD,true).name='near-octagonal-upper-deck';
    for(const x of [-.24,.24])disk(body,[x,.52,-.17],.17,[0,1,0],'#4d6675','solar-thermal-collector-window');
    for(const x of [-.27,.27])box(body,[.25,.28,.55],[x,.1,0],GREEN);
    const wheels=group('wheels',v(0,-.8,0));
    for(const s of [-1,1]){
      const pivot:Point3=[s*.65,-.03,0],front:Point3=[s*.91,-.40,.8],bogie:Point3=[s*.9,-.24,-.37];
      detailRod(wheels,pivot,front,.045,SILVER,true);detailRod(wheels,pivot,bogie,.045,SILVER,true);
      for(const z of [-.82,-.05])detailRod(wheels,bogie,[s*.92,-.4,z],.04,SILVER,true);
      for(const z of [-.82,-.05,.8]){const w=cylinder(wheels,.27,.20,[s*.95,-.43,z],'#888f84',.27,true);w.rotation.z=Math.PI/2;w.name='Zhurong-wheel';
        disk(wheels,[s*1.056,-.43,z],.10,[s,0,0],DARK,'wheel-hub');
        for(let j=0;j<16;j++){const a=j*Math.PI/8;const g=box(wheels,[.21,.022,.052],[s*.95,-.43+Math.cos(a)*.271,z+Math.sin(a)*.271],DARK,true);g.rotation.x=-a;g.name='wheel-grouser';}}
    }
    const solar=group('solar',v(1.1,.5,0));
    for(const sx of [-1,1])for(const sz of [-1,1]){
      const points:Point3[]=[[sx*.67,.48,sz*.08],[sx*1.84,.46,sz*.28],[sx*1.88,.46,sz*1.13],[sx*.9,.48,sz*.90]];
      face(solar,points,BLUE,true).name='butterfly-solar-wing';
      for(let j=1;j<7;j++){const t=j/7;detailRod(solar,[sx*(.67+1.17*t),.485,sz*(.08+.20*t)],[sx*(.9+.98*t),.485,sz*(.9+.23*t)],.006,'#7996af',true);}
      detailRod(solar,[sx*.7,.46,sz*.17],[sx*.9,.46,sz*.85],.018,SILVER,true);
    }
    const frame=group('frame',v(0,1.1,.7));detailRod(frame,[0,.5,.73],[0,1.62,.73],.045,SILVER,true).name='forward-mast';box(frame,[.53,.17,.23],[0,1.64,.75],SILVER,true);
    const ins=group('instruments',v(-.9,.6,.7));for(const x of [-.17,.17])camera(ins,[x,1.65,.90],.065);camera(ins,[0,1.49,.92],.06);for(const x of [-.38,.38])detailRod(ins,[x,.26,-.8],[x,.13,-1.6],.013,SILVER,true).name='subsurface-radar-antenna';
    const ant=group('antenna',v(0,1,-.8));detailRod(ant,[.2,.5,-.65],[.2,.9,-.65],.03,SILVER,true);dish(ant,[.2,.92,-.65],.34,[0,.8,-.6],'rear-high-gain-antenna');return true;
  }
  if(id==='slim'){
    // Nominal pre-touchdown attitude. Actual 2024 final attitude is intentionally not reconstructed.
    const body=group('body',v(-1,0,0));
    loft(body,[[[-.68,-.75,-.55],[.68,-.75,-.55],[.68,-.75,.55],[-.68,-.75,.55]],[[-.52,1.03,-.47],[.52,1.03,-.47],[.52,1.03,.47],[-.52,1.03,.47]]],GOLD,true).name='SLIM-tapered-main-body';
    sphere(body,.47,[0,.1,0],'#bdc9c8').name='structural-propellant-tank-schematic';
    const legs=group('legs',v(0,-.7,.7));
    const contacts:Point3[]=[[0,-1.04,.42],[-.78,.12,.63],[.78,.12,.63],[-.6,1.17,.58],[.6,1.17,.58]];
    contacts.forEach((p,i)=>{const q:Point3=[p[0]*.75,Math.max(-.7,Math.min(.95,p[1])),p[2]-.23];detailRod(legs,q,p,.04,SILVER,true);const pad=mesh(legs,new THREE.IcosahedronGeometry(i===0?.17:.13,1),'#a79b84',p,true);pad.name=i===0?'primary-crush-pad':'auxiliary-crush-pad-'+i;});
    const prop=group('propulsion',v(0,-1.15,0));for(const x of [-.32,.32]){engine(prop,.18,-.79,x,-.15);}for(const x of [-.57,.57]){disk(prop,[x,.72,0],.045,[Math.sign(x),0,0],DARK,'RCS-nozzle');}
    const solar=group('solar',v(0,0,-1));
    box(solar,[1.07,1.46,.025],[0,.16,-.54],BLUE,true).name='SLIM-body-mounted-solar-array';for(let i=0;i<7;i++)box(solar,[.008,1.46,.03],[-.48+i*.16,.16,-.56],'#8ca4ba',true);for(let j=0;j<10;j++)box(solar,[1.07,.008,.03],[0,-.52+j*.15,-.56],'#8ca4ba',true);
    const ins=group('instruments',v(1,.3,.6));camera(ins,[.38,-.64,.53],.09);camera(ins,[-.30,-.64,.53],.065);box(ins,[.25,.24,.21],[.44,.30,.53],SILVER,true).name='multiband-camera-package';disk(ins,[.44,.30,.66],.075,[0,0,1],DARK,'MBC-aperture');
    const av=group('avionics',v(1,.6,-.5));box(av,[.32,.24,.44],[-.24,.58,0],GREEN);box(av,[.30,.25,.40],[.22,.58,0],DARK);return true;
  }
  // Chinese sample-return landers and Vikram have separate, identifiable decks and deployment hardware.
  const ce3=id==='change-3',ce6=id==='change-6',ch3=id==='chandrayaan-3';
  const body=group('body',v(-1,.25,0));
  const outline:Point3[]=[[-.70,0,-.82],[.70,0,-.82],[.90,0,-.58],[.90,0,.58],[.7,0,.82],[-.7,0,.82],[-.9,0,.58],[-.9,0,-.58]];
  loft(body,[outline.map(([x,,z]):Point3=>[x,-.22,z]),outline.map(([x,,z]):Point3=>[x,.64,z])],GOLD,true).name=ch3?'Vikram-cut-corner-body':'Change-lander-octagonal-deck';
  for(const x of [-.38,.38])sphere(body,.29,[x,.15,0],SILVER).name='lander-tank-functional-volume';
  if(!ch3){if(!ce3)engine(body,.26,-.23);box(body,[1.55,.055,1.4],[0,.66,0],SILVER,true).name='upper-deck';}
  const legs=group('legs',v(0,-.9,0));legs4(legs,ch3?1.9:1.85,.50);
  const ins=group('instruments',v(1,.5,.5));
  if(ch3){
    const prop=group('propulsion',v(0,-1.3,0));for(const x of [-.53,.53])for(const z of [-.45,.45])engine(prop,.15,-.21,x,z);
    for(const x of [-.76,.76])for(const z of [-.57,.57]){disk(prop,[x,.35,z],.035,[Math.sign(x),0,0],DARK,'attitude-thruster');disk(prop,[x*.85,.35,z*1.33],.035,[0,0,Math.sign(z)],DARK,'attitude-thruster');}
    camera(ins,[-.45,.4,.83],.07);camera(ins,[.45,.4,.83],.06);detailRod(ins,[.6,.65,.45],[.92,.85,.65],.012,SILVER,true).name='Langmuir-probe';
    box(ins,[.28,.18,.21],[-.76,.62,-.42],SILVER,true).name='ChaSTE-functional-package';
    const payload=group('payload',v(0,0,1.3));
    for(const x of [-.27,.27]){const ramp=box(payload,[.20,.04,1.65],[x,-.27,1.37],SILVER,true);ramp.rotation.x=.55;ramp.name='Pragyan-deployment-ramp';}
    box(payload,[.42,.22,.48],[0,-.46,1.83],GOLD,true).name='Pragyan-rover-envelope';
    for(const s of [-1,1])for(const z of [1.66,1.84,2.02]){const w=cylinder(payload,.07,.045,[s*.24,-.58,z],DARK,.07,true);w.rotation.z=Math.PI/2;}
    const solar=group('solar',v(0,0,-1));box(solar,[1.40,.70,.028],[0,.18,-.84],BLUE,true).name='Vikram-side-solar-array';
    for(let i=0;i<8;i++)box(solar,[.008,.7,.032],[-.66+i*.19,.18,-.86],'#91a7bb',true);for(const x of [-.91,.91])box(solar,[.025,.63,.6],[x,.22,.05],BLUE,true).name='Vikram-side-cell-surface';
    return true;
  }
  const solar=group('solar',v(1.25,.2,-.6));
  for(const s of [-1,1]){detailRod(solar,[s*.8,.55,0],[s*1.12,.55,0],.025,SILVER,true);panel(solar,[s*1.65,.55,0],1.05,ce3?1.45:1.35,'deployed-lander-solar-wing');}
  if(ce3){
    const prop=group('propulsion',v(0,-1.35,.5));for(const x of [-.8,.8])disk(prop,[x,.3,.5],.04,[Math.sign(x),0,0],DARK,'attitude-thruster');engine(prop,.25,-.24);
    const payload=group('payload',v(0,1.1,.65));box(payload,[.68,.24,.72],[0,.84,0],GOLD,true).name='Yutu-rover-body';
    for(const side of [-1,1])panel(payload,[side*.54,.98,0],.38,.65,'Yutu-deployed-solar-wing');
    for(const s of [-1,1])for(const z of [-.27,0,.27]){const w=cylinder(payload,.10,.07,[s*.38,.73,z],DARK,.10,true);w.rotation.z=Math.PI/2;}
    detailRod(payload,[0,.96,.23],[0,1.34,.23],.025,SILVER,true);box(payload,[.29,.10,.11],[0,1.34,.23],SILVER,true);
    for(const x of [-.27,.27]){const ramp=box(payload,[.19,.045,1.65],[x,.07,1.25],SILVER,true);ramp.rotation.x=.68;ramp.name='Yutu-transfer-ramp';}
    camera(ins,[.55,.75,.42],.07);box(ins,[.32,.25,.32],[-.55,.76,-.30],SILVER,true).name='lunar-ultraviolet-telescope-envelope';dish(ins,[.60,.9,-.28],.22,[.3,.8,-.4],'lander-communication-antenna');
  }else{
    const ascent=group('stage-2',v(0,1.25,0));
    loft(ascent,[outline.map(([x,,z]):Point3=>[x*.65,.69,z*.65]),outline.map(([x,,z]):Point3=>[x*.60,1.39,z*.60])],GOLD,true).name='sample-return-ascent-stage';
    box(ascent,[.68,.045,.60],[0,1.42,0],SILVER,true);engine(ascent,.16,.70);
    const dock=group('docking',v(0,1.8,.4));cylinder(dock,.22,.12,[0,1.52,0],DARK,.22,true).name='ascent-docking-interface';cylinder(dock,.10,.12,[0,1.63,0],SILVER,.10,true).name='sample-container-functional-volume';
    detailRod(ins,[.67,.67,.38],[1.1,.78,.9],.05,SILVER,true).name='surface-sampling-arm-upper';detailRod(ins,[1.1,.78,.9],[1.34,-.26,1.30],.035,SILVER,true);box(ins,[.25,.12,.17],[1.34,-.32,1.30],DARK,true).name='sample-scoop';
    detailRod(ins,[-.7,.8,.48],[-.7,-.74,.48],.035,SILVER,true).name='drill-sampling-mechanism';box(ins,[.25,.28,.22],[-.7,.56,.48],DARK,true).name='drill-drive-envelope';camera(ins,[-.50,1.0,.62],.07);
    if(ce6){const ant=group('antenna',v(1,1,-.5));dish(ant,[.72,.95,-.45],.30,[.3,.8,-.4],'relay-communication-antenna');box(ins,[.23,.25,.25],[-.78,.42,-.53],SILVER,true).name='NILS-instrument-envelope';box(ins,[.23,.18,.20],[.80,.40,-.32],DARK,true).name='international-payload-envelope';}
    else {const shield=group('heatshield',v(1.4,0,0));cylinder(shield,.44,.07,[3.1,-.72,0],DARK,.44,true).name='separate-Earth-return-capsule-heatshield';cylinder(shield,.43,.55,[3.1,-.42,0],SILVER,.20,true).name='separate-return-capsule-reference';}
  }
  return true;
}
