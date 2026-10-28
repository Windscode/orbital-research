import {useState} from 'react';
import {ArrowDownToLine,ArrowUpRight} from 'lucide-react';
import {gridConvergence,rangeDifferences,rangeDirections,solveRangeBias} from './methodCalculations';
import './method-notes.css';
const f=(n:number,d=6)=>n.toLocaleString('en-US',{maximumFractionDigits:d});
function save(id:string,data:unknown){const u=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download=id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
export default function MethodWorkedNote({id}:{id:string}){
 const [bias,setBias]=useState(true),[sigma,setSigma]=useState(2),[same,setSame]=useState(false),[grid,setGrid]=useState('nasa');
 const w=solveRangeBias({estimateBias:bias,fourthSigma:sigma,identical:same});
 const values=grid==='nasa'?[.9705,.96854,.96178]:grid==='oscillation'?[1.01,.99,1.04]:[.9,.95,.98],g=gridConvergence(values[0],values[1],values[2]);
 if(id!=='orbit-determination'&&id!=='cfd-verification')return null;
 return <section className="method-note"><span className="eyebrow">WORKED RECORD / 数据、计算与结果</span>
 {id==='orbit-determination'?<><h2>五条测距差的加权解算</h2><p>静态二维线性化教学数据。未知量为位置改正 δx、δy 与公共偏置 b；这里没有真实遥测、轨道传播或光行时修正。</p>
 <div className="method-controls"><label><input type="checkbox" checked={bias} onChange={e=>setBias(e.target.checked)}/>估计公共偏置 b</label><label><input type="checkbox" checked={same} onChange={e=>setSame(e.target.checked)}/>全部视线改为 (1, 0)</label><label>第 4 条测量标准差 <b>{sigma} m</b><input type="range" min="2" max="20" step="1" value={sigma} aria-label="第四条测量标准差" onChange={e=>setSigma(+e.target.value)}/></label></div>
 {w.status==='solved'?<div className="method-result">{w.x.map((x,i)=><div key={i}><span>{['δx','δy','b'][i]} / m</span><strong>{f(x)}</strong><small>形式 σ = {f(w.parameterSigma[i])} m</small></div>)}<div><span>白化平方残差和 J</span><strong>{f(w.objective)}</strong><small>自由度 {5-w.rank} · 已知绝对噪声尺度</small></div></div>:<div className="method-rank"><b>矩阵秩为 {w.rank}，不能得到唯一参数解。</b><p>{bias?'只能约束 δx + b；δy 完全不可见。任何 (δx+c, δy+d, b−c) 都给出相同预测。':'只能约束 δx；δy 完全不可见。'}重复相同视线不会增加独立约束。</p></div>}
 <div className="method-table"><table><caption>观测差 d = 观测 − 参考预测，单位 m；残差 = d − Hθ</caption><thead><tr><th>观测</th><th>uₓ, uᵧ</th><th>d / m</th><th>σ / m</th><th>1/σ²</th><th>残差 / m</th></tr></thead><tbody>{rangeDirections.map((u,i)=><tr key={i}><th>{i+1}</th><td>{same?'1, 0':u.join(', ')}</td><td>{rangeDifferences[i]}</td><td>{w.sigma[i]}</td><td>{f(1/w.sigma[i]**2,4)}</td><td>{w.status==='solved'?f(w.residuals[i]):'无唯一解'}</td></tr>)}</tbody></table></div>
 <p>实现先将 H 和 d 的每行除以 σ，再以 Householder QR 求解。关闭偏置估计可观察位置如何吸收公共误差；将第 4 条 σ 从 2 m 调到 20 m，它的平方残差权重会降低 100 倍。</p>
 {w.status==='solved'&&<details><summary>查看完整形式协方差与求解检查</summary><pre>P / m²{'\n'}{w.covariance.map(r=>r.map(v=>f(v)).join('   ')).join('\n')}{'\n\n'}HᵀWr ≈ [{w.normalResidual.map(v=>v.toExponential(2)).join(', ')}]</pre><p>输入 σ 已是绝对噪声标准差，因此 P 不再乘 J / 自由度。驻点条件接近零只检查本次线性解算，不能证明观测模型正确。</p></details>}
 <button onClick={()=>save('range-bias-worked-record',{dataNature:'Synthetic static linearized 2D teaching example',parameters:{bias,sigma,same},result:w})}><ArrowDownToLine size={15}/>导出当前输入与结果</button>
 </>:<><h2>NASA 进气道三网格数据复算</h2><p>采用 NASA NPARC 教程公布的压力恢复系数。本页复算表格，未重跑原始 CFD。教程对 i、j 方向系统加密，k 保持不变；这里使用相邻网格尺度比 r = 2。</p>
 <label className="method-dataset">数据组<select value={grid} onChange={e=>setGrid(e.target.value)} aria-label="网格收敛数据组"><option value="nasa">NASA 公开压力恢复表</option><option value="oscillation">教学反例：差值异号</option><option value="divergence">教学反例：细化差值增大</option></select></label>
 <div className="method-table"><table><thead><tr><th>网格</th><th>相对尺度 h</th><th>压力恢复 φ（无量纲）</th></tr></thead><tbody>{values.map((v,i)=><tr key={i}><th>{['细网格 1','中网格 2','粗网格 3'][i]}</th><td>{2**i}</td><td>{v.toFixed(5)}</td></tr>)}</tbody></table></div>
 {g.status==='monotonic'?<><div className="method-result"><div><span>观察阶 p</span><strong>{f(g.p)}</strong></div><div><span>Richardson 外推</span><strong>{f(g.extrapolated,9)}</strong></div><div><span>细网格 GCI</span><strong>{f(g.gci*100)}%</strong></div></div><pre>p = ln(ε₃₂ / ε₂₁) / ln r{'\n'}φ_ext = φ₁ + (φ₁ − φ₂) / (rᵖ − 1){'\n'}GCI₂₁ = 1.25 |φ₁ − φ₂| / [|φ₁| (rᵖ − 1)]</pre><p>离散不确定度估计为 ±{f(g.absolute,9)}。外推值是网格误差模型下的极限估计，不能当作实验真值；GCI 不包括边界输入与湍流模型误差。</p><div className="method-rank"><b>为什么“渐近比值接近 1”还不够</b><p>这组三点既用于求 p，也用于算 GCI₃₂ / (rᵖ GCI₂₁)，后者会代数化简为 |φ₁ / φ₂| = {f(g.ratio)}。它不是独立的渐近区证明。需增加第四级实际计算，并检查观察阶、外推值及迭代误差是否稳定。</p></div></>:<div className="method-rank"><b>{g.status==='oscillatory'?'差值异号：停止使用单调幂律简式。':'细化差值未缩小：不支持正阶单调收敛假设。'}</b><p>本组是自构教学反例。不要对差值取绝对值后强行输出 GCI；应检查网格族、迭代误差与局部流动结构，再选择适当分析方法。</p></div>}
 <button onClick={()=>save('grid-convergence-record',{dataNature:grid==='nasa'?'NASA NPARC published table; CFD not rerun':'Synthetic teaching counterexample',fineToCoarse:values,r:2,result:g})}><ArrowDownToLine size={15}/>导出当前数据与计算</button><a href="https://www.grc.nasa.gov/www/wind/valid/tutorial/spatconv.html" target="_blank" rel="noreferrer">NASA 原始表格与方法 <ArrowUpRight size={14}/></a>
 </>}</section>;
}
