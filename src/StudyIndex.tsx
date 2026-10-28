import {useState} from 'react';
import {ArrowRight,ArrowUpRight,Database,FileCode2,Search} from 'lucide-react';
import './study-index.css';

const studies=[
 {id:'naca',group:'公开数据',field:'气动力',title:'NACA 0012：从表面压力到升力、阻力',question:'为什么升力几乎对上了，阻力却只算出一半？',input:'CFL3D / SA · 3 个迎角 · 每组 513 个表面点',output:'压力积分、面元贡献、采样敏感性与原作者总气动力对照',files:'原始 DAT · CSV · Python',href:'#/research?view=data&case=naca0012',code:'02',accent:'copper'},
 {id:'mro',group:'公开数据',field:'轨道',title:'MRO：二体轨道与导航星历',question:'积分误差已经很小，为什么两条轨道仍然相差很远？',input:'JPL Horizons · 289 个六维状态 · 24 h / TDB',output:'瞬时根数、位置差、RTN 分量与 RK4 步长比较',files:'原始响应 · JSON / CSV · Python',href:'#/research?view=data',code:'01',accent:'teal'},
 {id:'thermal',group:'解析基准',field:'传热',title:'两热容接触换热',question:'能量守恒能否保证温度正确？',input:'热容、初温、界面导热系数与时间步',output:'解析温度、Euler 轨迹与稳定边界',files:'JSON / CSV · Python',href:'#/research?view=examples&case=thermal-contact'},
 {id:'radiation',group:'解析基准',field:'热环境',title:'单面散热板热平衡',question:'太阳吸收、地球红外和辐射散热怎样分别记账？',input:'面积、朝向、吸收率、发射率与环境通量',output:'功率收支与平衡温度',files:'JSON / CSV · Python',href:'#/research?view=examples&case=radiative-balance'},
 {id:'mass',group:'解析基准',field:'质量属性',title:'Sputnik 1：质量分布与惯量',question:'外形与总质量相同，姿态响应还会改变多少？',input:'公开质量和直径；三种作者设定的内部质量分布',output:'惯性张量与转动响应，区分事实和假设',files:'JSON / CSV · Python',href:'#/research?view=examples&case=mass-distribution'},
 {id:'wls',group:'估计与验证',field:'参数估计',title:'带测距偏置的加权最小二乘',question:'观测几何退化时，哪些参数仍然可以确定？',input:'5 条作者构造的线性化观测、标准差与方向',output:'QR 解、残差、协方差与秩亏反例',files:'JSON · 逐步推导',href:'#/knowledge?read=lesson%2Forbit-determination'},
 {id:'gci',group:'估计与验证',field:'CFD 验证',title:'三组网格的压力恢复系数',question:'什么时候不能继续算 Richardson 外推？',input:'NASA NPARC 教程的三组结果',output:'观测阶、GCI、振荡和发散反例',files:'JSON · 原文数据表',href:'#/knowledge?read=lesson%2Fcfd-verification'},
 {id:'modes',group:'估计与验证',field:'结构动力学',title:'两自由度结构：模态截断',question:'有效质量覆盖率 100%，为什么还会漏掉弹簧内力？',input:'两块 1 kg 质量、三根 100 N/m 弹簧与三种载荷',output:'完整解、单模态解、局部力与平衡残差',files:'交互对照 · 矩阵与推导',href:'#/knowledge?read=lesson%2Fstructural-dynamics'},
 {id:'apollo',group:'估计与验证',field:'任务质量属性',title:'Apollo 11：两舱质量与惯量重构',question:'原报告的分离前后数据能否闭合？',input:'任务报告表 A-I：两舱质量、站位重心与对角惯量',output:'单位换算、组合重心与平行轴项开关对照',files:'原报告页码 · 原始数据表',href:'#/vehicles?read=vehicle%2Fapollo-csm'},
 {id:'integrators',group:'估计与验证',field:'数值积分',title:'轨道数值验证台',question:'短期精度、长期守恒和计算代价如何比较？',input:'三种初值、时间跨度、步长与积分方法',output:'位置误差、能量漂移与步长求精',files:'JSON / CSV',href:'#/lab?experiment=numerical'}
];
export default function StudyIndex(){
 const [filter,setFilter]=useState('全部'),[query,setQuery]=useState('');
 const results=studies.filter(s=>(filter==='全部'||s.group===filter)&&[s.title,s.question,s.input,s.field].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
 return <div className="study-index content-wrap">
  <header className="study-index-header"><div><span className="study-overline">RESEARCH DESK / 研究与算例</span><h1>数据、模型与复算</h1><p>读取公开文件，复算气动力或轨道状态。也可以从已知解出发，检查时间步、观测几何和质量分布对结果的影响。</p></div><aside><Database size={22}/><strong>原始资料 → 方程 → 计算记录</strong><p>公开数据保留来源和快照；构造算例说明假设。下载文件后可以独立计算。</p></aside></header>
  <div className="study-index-controls"><div role="group" aria-label="筛选研究类型">{['全部','公开数据','解析基准','估计与验证'].map(f=><button key={f} aria-pressed={filter===f} onClick={()=>setFilter(f)}>{f}</button>)}</div><label><Search size={16}/><input aria-label="搜索研究与算例" placeholder="搜索气动力、轨道、传热…" value={query} onChange={e=>setQuery(e.target.value)}/></label></div>
  <div className="study-result-count" role="status">{results.length} 项可阅读或运行的研究</div>
  <div className="study-index-grid">{results.map(s=><article className={`study-index-card ${s.accent||''}`} key={s.id}><div className="study-card-meta"><span>{s.group} / {s.field}</span><span>{s.code?`DATA ${s.code}`:<FileCode2 size={17}/>}</span></div><h2><a href={s.href}>{s.title}<ArrowUpRight size={19}/></a></h2><p className="study-card-question">{s.question}</p><dl><div><dt>输入</dt><dd>{s.input}</dd></div><div><dt>计算内容</dt><dd>{s.output}</dd></div></dl><footer><span>{s.files}</span><a href={s.href}>打开研究<ArrowRight size={16}/></a></footer></article>)}</div>
  {!results.length&&<p className="study-empty">没有匹配的研究。可以清空搜索，或切换研究类型。</p>}
  <section className="study-next"><div><span className="study-overline">RESEARCH PLANS</span><h2>继续建立自己的研究</h2><p>六条跨学科路线整理所需知识、输入资料与实施顺序；工具目录提供软件入口和起步说明。</p></div><a href="#/research?view=routes">查看研究路线<ArrowUpRight size={17}/></a><a href="#/resources">查找工具与数据<ArrowUpRight size={17}/></a></section>
 </div>;
}
