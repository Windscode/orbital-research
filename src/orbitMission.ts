import {EARTH_MU,EARTH_RADIUS,keplerPosition,orbitElements} from './orbit';
export const EARTH_ROTATION=7.292115e-5;
export const EARTH_J2=1.08262668e-3;
export const DEG=Math.PI/180;
export type Vector3=[number,number,number];
export interface MissionOrbit {perigee:number;apogee:number;inclination:number;raan:number;argPerigee:number;meanAnomaly:number}
export const defaultMission:MissionOrbit={perigee:400,apogee:400,inclination:51.6,raan:25,argPerigee:0,meanAnomaly:0};
export function validateMission(c:MissionOrbit){
 if(!c||![c.perigee,c.apogee,c.inclination,c.raan,c.argPerigee,c.meanAnomaly].every(Number.isFinite)||c.perigee<200||c.perigee>36000||c.apogee<c.perigee||c.apogee>80000||c.inclination<0||c.inclination>180)throw new RangeError('轨道参数超出实验范围');
}
export function rotatePerifocal(v:Vector3,c:Pick<MissionOrbit,'inclination'|'raan'|'argPerigee'>):Vector3{
 const O=c.raan*DEG,i=c.inclination*DEG,w=c.argPerigee*DEG,co=Math.cos(O),so=Math.sin(O),ci=Math.cos(i),si=Math.sin(i),cw=Math.cos(w),sw=Math.sin(w);
 return [(co*cw-so*sw*ci)*v[0]+(-co*sw-so*cw*ci)*v[1]+so*si*v[2],(so*cw+co*sw*ci)*v[0]+(-so*sw+co*cw*ci)*v[1]-co*si*v[2],sw*si*v[0]+cw*si*v[1]+ci*v[2]];
}
export function missionState(c:MissionOrbit,time:number){
 validateMission(c);if(!Number.isFinite(time))throw new RangeError('无效传播时刻');
 const o=orbitElements(c.perigee,c.apogee),n=2*Math.PI/o.period,p=keplerPosition(c.meanAnomaly*DEG+n*time,o.e),cosE=p.x+o.e,sinE=p.y/Math.sqrt(1-o.e*o.e),dE=n/(1-o.e*cosE);
 const position=rotatePerifocal([o.a*p.x,o.a*p.y,0],c),velocity=rotatePerifocal([-o.a*sinE*dE,o.a*Math.sqrt(1-o.e*o.e)*cosE*dE,0],c);
 return {position,velocity,radius:Math.hypot(...position),speed:Math.hypot(...velocity)};
}
export function earthFixed(position:Vector3,time:number):Vector3{const angle=EARTH_ROTATION*time,c=Math.cos(angle),s=Math.sin(angle);return [c*position[0]+s*position[1],-s*position[0]+c*position[1],position[2]];}
export function subSatellite(position:Vector3,time:number){const p=earthFixed(position,time);return {latitude:Math.atan2(p[2],Math.hypot(p[0],p[1]))/DEG,longitude:Math.atan2(p[1],p[0])/DEG};}
export function groundTrack(c:MissionOrbit,duration:number,count=721){
 if(!Number.isFinite(duration)||duration<=0||!Number.isInteger(count)||count<2||count>10001)throw new RangeError('无效采样设置');
 const segments:{longitude:number;latitude:number;time:number}[][]=[[]];
 for(let j=0;j<count;j++){const time=j/(count-1)*duration,p={...subSatellite(missionState(c,time).position,time),time},last=segments.at(-1)!;if(last.length&&Math.abs(p.longitude-last.at(-1)!.longitude)>180)segments.push([]);segments.at(-1)!.push(p);}
 return segments;
}
export function hohmannTransfer(initialAltitude:number,targetAltitude:number,planeChange:number){
 if(![initialAltitude,targetAltitude,planeChange].every(Number.isFinite)||initialAltitude<200||targetAltitude<initialAltitude||targetAltitude>80000||planeChange<0||planeChange>180)throw new RangeError('无效变轨设置');
 const r1=EARTH_RADIUS+initialAltitude,r2=EARTH_RADIUS+targetAltitude,a=(r1+r2)/2,v1=Math.sqrt(EARTH_MU/r1),v2=Math.sqrt(EARTH_MU/r2),vp=Math.sqrt(EARTH_MU*(2/r1-1/a)),va=Math.sqrt(EARTH_MU*(2/r2-1/a));
 const departure=vp-v1,arrival=v2-va,combined=Math.hypot(v2-va,2*Math.sqrt(va*v2)*Math.sin(planeChange*DEG/2)),lowPlane=2*v1*Math.sin(planeChange*DEG/2),highPlane=2*v2*Math.sin(planeChange*DEG/2);
 return {r1,r2,a,v1,v2,vp,va,departure,arrival,combined,lowPlane,highPlane,coastTime:Math.PI*Math.sqrt(a*a*a/EARTH_MU),coplanarTotal:departure+arrival,combinedTotal:departure+combined,lowPlaneTotal:departure+arrival+lowPlane,highPlaneTotal:departure+arrival+highPlane};
}
export function j2Rates(c:MissionOrbit){validateMission(c);const o=orbitElements(c.perigee,c.apogee),p=o.a*(1-o.e*o.e),n=2*Math.PI/o.period,cos=Math.cos(c.inclination*DEG),factor=EARTH_J2*n*(EARTH_RADIUS/p)**2;return {node:-1.5*factor*cos,periapsis:.75*factor*(5*cos*cos-1)};}
export function sunSynchronousInclination(perigee:number,apogee:number){validateMission({...defaultMission,perigee,apogee});const o=orbitElements(perigee,apogee),p=o.a*(1-o.e*o.e),factor=1.5*EARTH_J2*(2*Math.PI/o.period)*(EARTH_RADIUS/p)**2,target=2*Math.PI/(365.2422*86400),cos=-target/factor;return Math.abs(cos)<=1?Math.acos(cos)/DEG:null;}
export const degPerDay=(radiansPerSecond:number)=>radiansPerSecond/DEG*86400;
export function missionReport(config:MissionOrbit,time:number){return {format:'orbital-mission-study',version:1,exportedAt:new Date().toISOString(),model:'Two-body Kepler ellipse; uniform Earth rotation; not a TLE/SGP4 or real satellite ephemeris',units:{length:'km',time:'s',speed:'km/s',angles:'deg'},frame:'Illustrative geocentric inertial axes; t=0 Earth angle is zero, not UTC/J2000 orientation; latitude is geocentric',constants:{earthRadius:EARTH_RADIUS,mu:EARTH_MU,earthRotation:EARTH_ROTATION},config,time,elements:orbitElements(config.perigee,config.apogee),state:missionState(config,time),subSatellite:subSatellite(missionState(config,time).position,time)};}
