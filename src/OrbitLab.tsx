import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowUpRight, Pause, Play, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { EARTH_RADIUS, orbitElements, keplerPosition } from './orbit';
import NumericalWorkbench from './NumericalWorkbench';


export default function OrbitLab() {
  const [mode,setMode]=useState<'verify'|'observe'>('verify');
  return <><div className="lab-mode-tabs" role="group" aria-label="轨道实验模式"><button className={mode==='verify'?'active':''} aria-pressed={mode==='verify'} onClick={()=>setMode('verify')}>01 / 数值验证台</button><button className={mode==='observe'?'active':''} aria-pressed={mode==='observe'} onClick={()=>setMode('observe')}>02 / 轨道观测台</button></div>{mode==='verify'?<NumericalWorkbench/>:<KeplerObservatory/>}</>;
}

function KeplerObservatory() {
  const [perigee, setPerigee] = useState(400);
  const [apogee, setApogee] = useState(2000);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(200);
  const [anomaly, setAnomaly] = useState(0);
  const [exported, setExported] = useState(false);
  const elapsed = useRef(0);
  const o = useMemo(() => orbitElements(perigee, apogee), [perigee, apogee]);
  useEffect(() => {
    if (!running) return;
    let frame = 0, last = 0;
    const tick = (time: number) => {
      if (last) elapsed.current += Math.min((time - last) / 1000, .1) * speed;
      last = time;
      setAnomaly((elapsed.current / o.period * 2 * Math.PI) % (2 * Math.PI));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, speed, o.period]);
  const reset = () => { setRunning(false); setAnomaly(0); elapsed.current = 0; };
  const preset = (p:number, a:number) => { setPerigee(p); setApogee(a); reset(); };
  const sx = 200 / (1 + o.e), earth = EARTH_RADIUS / o.a * sx;
  const pos = keplerPosition(anomaly, o.e);
  const radius = o.a * Math.sqrt(pos.x ** 2 + pos.y ** 2);
  const velocity = Math.sqrt(398600.4418 * (2 / radius - 1 / o.a));
  function download() {
    const data = { title:'ORBITAL 两体轨道教学实验', model:'Earth-centred Kepler ellipse; no J2, atmosphere, thrust or third bodies', units:'km, s, km/s', earthRadius: EARTH_RADIUS, mu:398600.4418, perigeeAltitude:perigee, apogeeAltitude:apogee, ...o };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    const a = document.createElement('a'); a.href=url; a.download='orbital-experiment.json'; a.click(); URL.revokeObjectURL(url); setExported(true); setTimeout(()=>setExported(false),2500);
  }
  return <div className="lab-layout">
    <div className="orbit-stage">
      <div className="stage-heading"><span><i className="status-dot"/> KEPLER OBSERVATORY</span><span>地心惯性视图 · 二维轨道平面</span></div>
      <svg viewBox="0 0 700 470" role="img" aria-label="交互式椭圆轨道；卫星遵循开普勒方程运动">
        <defs>
          <pattern id="orbit-grid" width="35" height="35" patternUnits="userSpaceOnUse"><path d="M35 0H0V35" fill="none" stroke="#ffffff" strokeOpacity=".04"/></pattern>
          <radialGradient id="lab-earth"><stop offset="0" stopColor="#496472"/><stop offset=".65" stopColor="#203c4b"/><stop offset="1" stopColor="#0c202b"/></radialGradient>
          <radialGradient id="earth-glow"><stop offset=".6" stopColor="#6cbdcb" stopOpacity="0"/><stop offset=".94" stopColor="#6cbdcb" stopOpacity=".12"/><stop offset="1" stopColor="#6cbdcb" stopOpacity="0"/></radialGradient>
        </defs>
        <rect width="700" height="470" fill="url(#orbit-grid)"/>
        <g transform="translate(350 230)">
          <path d="M-315 0H315M0-195V195" stroke="#66716e" strokeWidth=".6" strokeDasharray="4 7"/>
          <ellipse cx={-o.e*sx} cy="0" rx={sx} ry={sx*Math.sqrt(1-o.e*o.e)} fill="none" stroke="#d3ef83" strokeWidth="1.2"/>
          <circle r={earth*1.08} fill="url(#earth-glow)"/>
          <circle r={earth} fill="url(#lab-earth)" stroke="#6293a0" strokeWidth="1"/>
          <ellipse rx={earth*.45} ry={earth} fill="none" stroke="#91aeb6" strokeOpacity=".18"/><ellipse rx={earth} ry={earth*.35} fill="none" stroke="#91aeb6" strokeOpacity=".18"/><path d={`M0 ${-earth}V${earth}M${-earth} 0H${earth}`} stroke="#91aeb6" strokeOpacity=".15"/>
          <circle r="2" fill="#d3ef83"/>
          <line x1="0" y1="0" x2={pos.x*sx} y2={pos.y*sx} stroke="#d3ef83" strokeOpacity=".4" strokeDasharray="3 5"/>
          <circle cx={pos.x*sx} cy={pos.y*sx} r="11" fill="#d3ef83" opacity=".12"/>
          <circle cx={pos.x*sx} cy={pos.y*sx} r="4" fill="#e6ffab"/>
          <text x={(1-o.e)*sx+10} y="-14" fill="#d3ef83" fontSize="9" fontFamily="monospace">Pe {perigee.toLocaleString()} km</text>
          <text x={-(1+o.e)*sx-7} y="22" textAnchor="end" fill="#9da6a9" fontSize="9" fontFamily="monospace">Ap {apogee.toLocaleString()} km</text>
        </g>
        <text x="24" y="440" fill="#68757b" fontSize="9" fontFamily="monospace">EARTH / μ = 398600.4418 km³/s²</text>
        <text x="675" y="440" fill="#68757b" textAnchor="end" fontSize="9" fontFamily="monospace">ORBIT PLANE / AUTO SCALE</text>
      </svg>
      <div className="playback"><button className="play-button" onClick={()=>setRunning(!running)}>{running?<Pause size={15}/>:<Play size={15}/>} {running?'暂停传播':'开始传播'}</button><button className="icon-button" aria-label="重置轨道传播" onClick={reset}><RotateCcw size={16}/></button><label>时间倍率 <select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value="50">50×</option><option value="200">200×</option><option value="1000">1000×</option></select></label><span className="mono">T+ {Math.floor(elapsed.current).toLocaleString()} s</span></div>
    </div>
    <div className="lab-controls"><div className="eyebrow"><SlidersHorizontal size={14}/> 你的轨道，由你定义</div><h3>轨道参数</h3><p>改变远近地点，观察轨道形状、速度和周期如何一起变化。</p>
      <div className="preset-row"><button onClick={()=>preset(400,400)}>近地圆轨道</button><button onClick={()=>preset(400,35786)}>地球转移轨道</button></div>
      <label className="slider-label" htmlFor="perigee">近地点高度 <strong>{perigee.toLocaleString()} <small>km</small></strong></label><input id="perigee" type="range" min="200" max="2000" step="10" value={perigee} onChange={e=>{const p=Number(e.target.value);setPerigee(p);setApogee(Math.max(p,apogee));reset();}}/>
      <label className="slider-label" htmlFor="apogee">远地点高度 <strong>{apogee.toLocaleString()} <small>km</small></strong></label><input id="apogee" type="range" min={perigee} max="36000" step="1" value={apogee} onChange={e=>{setApogee(Number(e.target.value));reset();}}/>
      <div className="orbit-readouts"><div><span>轨道周期</span><strong>{(o.period/60).toFixed(1)} <small>min</small></strong></div><div><span>偏心率</span><strong>{o.e.toFixed(4)}</strong></div><div><span>当前速度</span><strong>{velocity.toFixed(3)} <small>km/s</small></strong></div><div><span>当前高度</span><strong>{(radius-EARTH_RADIUS).toFixed(0)} <small>km</small></strong></div></div>
      <button className="button secondary wide" onClick={download}><ArrowDownToLine size={16}/>{exported?'参数已导出':'导出实验参数'}<ArrowUpRight size={14}/></button>
    </div>
    <div className="lab-method"><span className="pill">MODEL NOTES</span><div><h3>二体模型与假设</h3><p>地球中心二体模型，使用开普勒方程按平均近点角传播。地球半径取 6378.137 km，μ = 398600.4418 km³/s²。忽略 J₂、阻力、第三体与推力；图中地球为示意，轨道采用自动缩放。实验只用于理解关系，不用于任务设计。</p><code>v² = μ(2/r − 1/a)　 ·　 T = 2π√(a³/μ)</code><a href="https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/conics_c.html" target="_blank" rel="noreferrer">参考：NAIF / Conic elements <ArrowUpRight size={13}/></a></div></div>
  </div>;
}
