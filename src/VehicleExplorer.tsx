import {useRef,useState} from 'react';
import {ArrowDownToLine,ArrowUpRight,Box,Camera,Crosshair,Eye,EyeOff,Layers3,Maximize2,MousePointer2,RotateCcw,RotateCw,Scissors,Search,SlidersHorizontal} from 'lucide-react';
import {assetUrl} from './assetUrl';
import {initialModelView,type ModelMode,type ModelViewState,type SectionAxis,type ViewPreset} from './modelView';
import {useVehicleScene} from './useVehicleScene';
import type {Vehicle} from './types';

const modes:{id:ModelMode;label:string;icon:typeof Box}[]=[{id:'solid',label:'外观',icon:Box},{id:'cutaway',label:'剖切',icon:Scissors},{id:'xray',label:'透明外壳',icon:Eye},{id:'internal',label:'移除外壳',icon:Layers3},{id:'wire',label:'线框',icon:SlidersHorizontal}];
const views:{id:ViewPreset;label:string}[]=[{id:'iso',label:'轴测方向'},{id:'front',label:'前视 +Z'},{id:'right',label:'侧视 +X'},{id:'top',label:'顶视 +Y'},{id:'rear',label:'后视 −Z'}];

export default function VehicleExplorer({vehicle,onRead}:{vehicle:Vehicle;onRead:()=>void}){
  const host=useRef<HTMLDivElement>(null);
  const [view,setView]=useState<ModelViewState>({...initialModelView}),[ortho,setOrtho]=useState(false),[tab,setTab]=useState<'parts'|'research'>('parts'),[query,setQuery]=useState('');
  const patch=(value:Partial<ModelViewState>)=>setView(old=>({...old,...value}));
  const choose=(id:string)=>{patch({selected:id,hidden:view.hidden.filter(item=>item!==id)});setTab('parts');};
  const scene=useVehicleScene(host,vehicle,view,choose);
  const model=vehicle.model!,review=model.review,selected=model.parts.find(p=>p.id===view.selected);
  const selectedFeatures=review?.features.filter(feature=>feature.partId===view.selected)||[];
  const parts=model.parts.filter(part=>scene.parts.includes(part.id)&&`${part.name} ${part.description}`.toLowerCase().includes(query.toLowerCase()));
  const hide=(id:string)=>patch({hidden:view.hidden.includes(id)?view.hidden.filter(item=>item!==id):[...view.hidden,id]});
  const reset=()=>{setView({...initialModelView});setOrtho(false);scene.api.current.projection(false);scene.api.current.preset('iso');};
  return <div className="model-explorer model-explorer-v8">
    <div className="model-main">
      <div className="model-meta"><span><i className="status-dot"/> 构型研究 / 3D</span><span>{vehicle.year} · {scene.parts.length} 部件组</span></div>
      <div className="model-viewport">
        <div className="model-canvas" ref={host}/>{(!scene.ready||scene.error)&&<div className="model-placeholder"><Box size={36}/><p>{scene.error||'正在构建三维部件…'}</p></div>}
        <div className="model-nameplate"><span>{vehicle.organization}</span><h2>{vehicle.name}</h2><p>{review?.configuration||'公开构型的简化研究模型'}</p></div>
        <div className="model-view-presets" aria-label="三维观察方向">{views.map(item=><button key={item.id} disabled={!scene.ready} onClick={()=>{patch({rotate:false});scene.api.current.preset(item.id);}}>{item.label}</button>)}</div>
        <div className="model-view-status"><span>{ortho?'正交投影':'透视投影'} / {modes.find(mode=>mode.id===view.mode)?.label}</span><span>{view.hidden.length>0?`隐藏 ${view.hidden.length} 组`:'完整装配'}{view.isolated&&selected?` · 单独显示 ${selected.name}`:''}</span></div>
        <div className="model-instruction"><MousePointer2 size={12}/> 拖动旋转 · 滚轮缩放 · 点击部件</div>
      </div>
      <div className="model-toolbar"><div>{modes.map(item=><button key={item.id} className={view.mode===item.id?'active':''} onClick={()=>patch({mode:item.id})} aria-pressed={view.mode===item.id}><item.icon size={15}/>{item.label}</button>)}</div><div><button onClick={()=>patch({rotate:!view.rotate})} className={view.rotate?'active':''} aria-pressed={view.rotate}><RotateCw size={15}/>自转</button><button onClick={()=>scene.api.current.fit()} aria-label="适配三维视图"><Maximize2 size={16}/></button><button onClick={reset} aria-label="重置三维模型"><RotateCcw size={16}/></button></div></div>
      <div className="model-controls-v8">
        <label className="model-explode-control"><span>部件分解 <b>{Math.round(view.explode/2.5*100)}%</b></span><input aria-label="模型拆分程度" type="range" min="0" max="2.5" step=".01" value={view.explode} onChange={event=>patch({explode:Number(event.target.value)})}/><small>装配状态<span>爆炸分解</span></small></label>
        <div className="model-display-options"><label><input type="checkbox" checked={ortho} onChange={event=>{setOrtho(event.target.checked);scene.api.current.projection(event.target.checked);}}/>正交投影</label><label><input type="checkbox" checked={view.edges} onChange={event=>patch({edges:event.target.checked})}/>结构轮廓</label><label><input type="checkbox" checked={view.grid} onChange={event=>patch({grid:event.target.checked})}/>参考网格</label><button onClick={()=>scene.api.current.snapshot()} disabled={!scene.ready}><Camera size={14}/>保存视图</button></div>
        {view.mode==='cutaway'&&<div className="model-section-control"><div><span>剖切方向</span>{(['x','y','z'] as SectionAxis[]).map(axis=><button className={view.axis===axis?'active':''} aria-pressed={view.axis===axis} key={axis} onClick={()=>patch({axis})}>{axis.toUpperCase()}</button>)}<button aria-pressed={view.flipped} onClick={()=>patch({flipped:!view.flipped})}>反向 {view.flipped?'−':'+'}</button></div><label><span>截面位置 <b>{Math.round((view.section+1)*50)}%</b></span><input aria-label="剖切平面位置" type="range" min="-1" max="1" step=".01" value={view.section} onChange={event=>patch({section:Number(event.target.value)})}/></label><small>截面按当前装配包络移动；开口未填充封盖。坐标轴仅为模型显示坐标。</small></div>}
      </div>
      <div className="model-disclaimer"><strong>模型范围</strong><p>{review?.uncertainties[0]||model.disclaimer} 内部件为功能级示意，未由尺寸图纸逐件约束。归一化网格不能用于质量、碰撞包络或制造计算。</p></div>
    </div>
    <aside className="model-sidebar">
      <div className="model-side-tabs" role="tablist" aria-label="模型资料"><button role="tab" aria-selected={tab==='parts'} onClick={()=>setTab('parts')}>部件浏览 <span>{scene.parts.length}</span></button><button role="tab" aria-selected={tab==='research'} onClick={()=>setTab('research')}>构型与依据</button></div>
      {tab==='parts'?<div className="model-side-content" role="tabpanel">
        <label className="model-part-search"><Search size={14}/><input aria-label="搜索模型部件" placeholder="查找部件或功能…" value={query} onChange={event=>setQuery(event.target.value)}/></label>
        {view.hidden.length>0&&<button className="model-unhide" onClick={()=>patch({hidden:[]})}>恢复 {view.hidden.length} 个隐藏部件</button>}
        <div className="part-list">{parts.map((part,index)=><div className={`model-part-row ${view.selected===part.id?'selected':''} ${view.hidden.includes(part.id)?'part-hidden':''}`} key={part.id}><button className="model-part-select" onClick={()=>choose(view.selected===part.id?'':part.id)} aria-pressed={view.selected===part.id}><span className="mono">{String(index+1).padStart(2,'0')}</span><span>{part.name}<small>{part.evidence}</small></span>{view.selected===part.id?<Crosshair size={14}/>:<Box size={13}/>}</button><button className="model-part-visibility" aria-label={`${view.hidden.includes(part.id)?'显示':'隐藏'}${part.name}`} aria-pressed={view.hidden.includes(part.id)} onClick={()=>hide(part.id)}>{view.hidden.includes(part.id)?<EyeOff size={15}/>:<Eye size={15}/>}</button></div>)}</div>
        {!parts.length&&<p className="model-no-results">没有匹配部件，试试系统名称或功能关键词。</p>}
        {selected?<div className="part-detail"><span className="eyebrow">PART / {selected.id.toUpperCase()}</span><h3>{selected.name}</h3><p>{selected.description}</p>{selectedFeatures.map(feature=><div className="model-selected-fact" key={feature.title}><strong>{feature.title}</strong><p>{feature.detail}</p></div>)}<a href={selectedFeatures[0]?.sourceUrl||selected.sourceUrl} target="_blank" rel="noreferrer">部件资料来源<ArrowUpRight size={13}/></a><button className={`button secondary wide ${view.isolated?'selected':''}`} onClick={()=>patch({isolated:!view.isolated,hidden:view.hidden.filter(id=>id!==selected.id)})}>{view.isolated?<Layers3 size={14}/>:<Eye size={14}/>} {view.isolated?'恢复全部部件':'单独查看该部件'}</button></div>:<div className="part-detail empty"><Crosshair size={27} strokeWidth={1}/><p>选择部件查看功能与资料；用眼睛按钮逐层隐藏结构。</p></div>}
      </div>:<div className="model-side-content model-research-tab" role="tabpanel">
        <span className="eyebrow">CONFIGURATION RECORD</span><h3>{review?.configuration||vehicle.name}</h3><p className="model-review-date">资料核对 {review?.reviewedOn||vehicle.verifiedOn} · 功能级模型</p>
        {review?.features.map((feature,index)=><article className="model-feature" key={feature.title}><span>{String(index+1).padStart(2,'0')}</span><div><h4>{feature.title}</h4><p>{feature.detail}</p><div><button onClick={()=>choose(feature.partId)}>定位部件<Crosshair size={12}/></button><a href={feature.sourceUrl} target="_blank" rel="noreferrer">原始资料<ArrowUpRight size={12}/></a></div></div></article>)}
        <details><summary>建模假设与未确定项</summary><ul>{(review?.uncertainties||vehicle.limitations).map(item=><li key={item}>{item}</li>)}</ul></details>
        <details><summary>本轮几何调整</summary><ul>{(review?.changes||['按公开构型整理部件分组。']).map(item=><li key={item}>{item}</li>)}</ul></details>
      </div>}
      <div className="model-sidebar-actions"><button className="button primary wide" onClick={onRead}>阅读完整档案<ArrowUpRight size={15}/></button><a className="button secondary wide" href={assetUrl(`/models/${vehicle.id}.glb`)} download={`${vehicle.id}-schematic.glb`}><ArrowDownToLine size={15}/>下载 GLB 研究模型</a><a className="model-manifest-link" href={assetUrl(`/models/${vehicle.id}.json`)} download={`${vehicle.id}-model-record.json`}>下载构型与来源记录 <ArrowDownToLine size={12}/></a><small>归一化教学模型 · 非制造 CAD</small></div>
    </aside>
  </div>;
}
