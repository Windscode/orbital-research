import type {Vehicle} from './types';
export default function VehicleInference({vehicle}:{vehicle:Vehicle}){
 const preparation=vehicle.inference.some(inf=>inf.method.startsWith('依据本页结构分解为'));
 return <><h2><span className="legend-dot inferred"/>参数推算方法与输入缺口</h2>{preparation&&<div className="research-callout"><span>质量属性建模准备</span><p>以下部件分解是研究方案。当前条目未给出可运行的部件质量与安装坐标表，也没有计算出该型号的重心或惯量。页面中的三维几何不会自动提供这些物理属性。</p><details><summary>完成质量模型还需要哪些输入</summary><p>逐件记录质量 mᵢ（kg）、局部质心与安装位置 rᵢ（m）、局部惯性张量 Iᵢ（kg·m²）、坐标轴旋转 Rᵢ，以及推进剂、载荷和附件工况。</p><p>总质心 r̄ = Σmᵢrᵢ / Σmᵢ；相对总质心的惯量需先旋转局部张量，再加平行轴项 mᵢ[(dᵢ·dᵢ)1 − dᵢdᵢᵀ]。仅用外形包络无法唯一确定这些输入。</p></details></div>}{vehicle.inference.map((inf,i)=><div className="inference-note" key={i}><h3><span className="mono">0{i+1}</span>{inf.parameter}</h3>{inf.method.startsWith('依据本页结构分解为')&&<span className="inference-status">部件划分建议 · 尚无数值模型</span>}<p>{inf.method}</p><dl><dt>前提假设</dt><dd>{inf.assumptions}</dd><dt>不确定性与缺失项</dt><dd>{inf.uncertainty}</dd></dl></div>)}</>;
}
