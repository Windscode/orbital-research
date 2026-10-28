// Apply the reviewed v13 research content. Does not query or run external solvers.
import {readFile,writeFile} from 'node:fs/promises';
const read=async file=>JSON.parse(await readFile(file,'utf8'));
const write=async(file,value)=>writeFile(file,JSON.stringify(value,null,2)+'\n');
const resources=await read('research/library.json');
const tmr='https://tmbwg.github.io/turbmodels/';
const updates={
 'fun3d':{
  accessModel:'restricted',
  license:'NASA 申请发行；官方说明限 US Person，须按获批许可使用和再分发',
  starterWorkflowStatus:'依据 TMR 典型输入和 FUN3D 公开说明核对；没有在本站运行 FUN3D。典型输入不是任意版本的完整可执行案例。',
  starterWorkflow:[
   '先保存 TMR 的 NACA 0012 案例页、SA 结果页和 fun3d.nml_typical_sa_2。记录所获 FUN3D 版本与发行资格。典型文件写 input_version=2.2，它不是当前软件版本号。',
   '核对 reference_physical_properties：mach_number=0.15、reynolds_number=6.0e6、temperature=540.0、temperature_units="Rankine"。540 °R 等于 300 K，不能把它输入为 540 K。angle_of_attack 在该文件中为 0°；10°和15°属于另行设置的工况。',
   '核对归一化：area_reference=1.0、x_moment_length=1.0；raw_grid 为 aflr3 / stream / twod_mode=true。配套网格、边界映射和物性仍须齐全，不能把 CFL3D 的结构 PLOT3D 输入原样交给 FUN3D。',
   '文件启用 turbulence_model="sa"，为 boundary_list="5" 请求 cp 和 skinfr 输出。边界编号属于该配套网格，换网格后必须重新对应。原文件 steps=24000 只规定迭代次数，不保证残差或积分力已收敛。',
   '同时保存 Cp、壁面摩擦、总 CL/CD 与迭代历史。先按相同参考量比较压力积分，再比较包含剪切的总力；本站 NACA 页面只复算 CFL3D 已发布数据，不是 FUN3D 本地复现成绩。'
  ],starterWorkflowSources:[{title:'TMR · FUN3D 典型 SA 输入',url:tmr+'NACA0012_validation/fun3d.nml_typical_sa_2'},{title:'TMR · SA 代码对照与边界说明',url:tmr+'naca0012_val_sa.html'},{title:'NASA FUN3D · 用户说明',url:'https://fun3d.larc.nasa.gov/chapter-1.html'}]
 },
 'ansys-fluent':{
  starterWorkflowStatus:'公开教学路线与输入检查；未运行 Fluent，未给出本站 Fluent 计算结果。',
  starterWorkflow:[
   '从 Ansys Innovation Courses 的 NASA 网格验证练习进入。该练习使用 449 × 129 网格、257 个表面点；本站展示的 CFL3D 压力来自 897 × 257、513 点。先把网格身份写进结果表，不能称为同网格代码比较。',
   '导入网格后核对弦长、前后缘闭合、壁面与远场边界。按 TMR 条件明确 M=0.15、Re_c=6×10⁶、迎角和 SA 模型，再由所选温度与黏性关系确定一致的速度、密度与黏度；不要独立随意指定它们。',
   '单独填写力系数参考量：动压、参考面积、弦长及力矩中心。二维系数按单位展向长度归一化；力的积分表面只选翼型壁面，远场边界不得混入。',
   '把升阻力方向随迎角旋转，保存压力贡献、黏性贡献、总力及上下表面 Cp。若机体轴为 x、法向为 y，则 drag=(cosα,sinα)、lift=(−sinα,cosα)；先以 α=0 检查符号，再检查非零迎角。',
   '按残差和 CL/CD 随迭代的稳定性判断停止条件；随后改变网格与远场设置。只看 Cp 外形吻合不能证明总阻力准确。CPU/GPU 支持范围、HPC 和其他产品联算授权仍需按所用版本核对。'
  ],starterWorkflowSources:[{title:'Ansys 官方课程 · 使用 NASA 网格验证翼型',url:'https://innovationspace.ansys.com/courses/courses/flow-over-an-airfoil/lessons/exercises-lesson-9-6/topic/airfoil-cfd-validation-using-a-nasa-provided-mesh/'},{title:'TMR · 工况、几何与实验适用范围',url:tmr+'naca0012_val.html'}]
 },
 'openfoam':{
  starterWorkflowStatus:'以下后处理接口固定到 OpenFOAM Foundation v13，避免与其他发行版及版本混用；未在本站运行 OpenFOAM。',
  starterWorkflow:[
   '保留完整 case 与 Foundation 版本。先用该版本的 foamPostProcess -list 查看可用函数对象；forceCoeffs 仍依赖有效压力、速度、黏性和边界字段，不是把一张 Cp 图片作为输入。',
   '用 forces 对明确的翼型 wall patches 积分压力和壁面剪切，再配置 forceCoeffs。核对 p 的物理量纲及密度口径；不可把不可压缩运动学压力 p/ρ 当作 Pa 后再错误乘密度。',
   '记录 magUInf、Aref、lRef 与 CofR，并指定 liftDir、dragDir、pitchAxis。对于弦长 1 m、厚度 0.01 m 的二维挤出网格，受力按整个厚度积分时 Aref 应为 0.01 m²；误写成 1 m²，会使力系数缩小 100 倍。此数值是独立量纲例，不是某个教程运行结果。',
   '按来流方向设置单位向量。迎角 10° 时，在 x-y 平面可用 dragDir=(0.984807753,0.173648178,0)、liftDir=(−0.173648178,0.984807753,0)。同时声明模型是否旋转、来流是否旋转，避免重复转角。',
   '读取输出文件头和物理量定义后再比较。本站 Cp 后处理只得到压力项；forceCoeffs 的总力来源还包括剪切。分别看压力、剪切与总力，并保留迭代史、网格尺寸、壁面分辨率和远场设置。'
  ],starterWorkflowSources:[{title:'Foundation v13 · forceCoeffs 接口',url:'https://cpp.openfoam.org/v13/classFoam_1_1functionObjects_1_1forceCoeffs.html'},{title:'Foundation v13 · forces 压力与剪切积分',url:'https://cpp.openfoam.org/v13/forces_8H_source.html'},{title:'Foundation v13 · 后处理用户指南',url:'https://doc.cfd.direct/openfoam/user-guide-v13/post-processing-functionality'}]
 }
};
for(const [id,fields] of Object.entries(updates)){const item=resources.find(r=>r.id===id);if(!item)throw Error(id);Object.assign(item,fields,{verifiedOn:'2026-10-29'});}
// Match the existing eligibility descriptions; do not claim a new terms review.
for(const id of ['espss','esa-godot'])resources.find(r=>r.id===id).accessModel='restricted';
const record={id:'nasa-tmr',title:'Turbulence Modeling Resource（TMR）',category:'数据与环境',kind:'公开数据',summary:'湍流模型方程、验证网格、实验资料与多代码参考结果；可下载原始文件检查自己的 CFD 设置和后处理。',details:'TMR 由湍流模型基准工作组维护，NASA 官方页面给出新站入口。资料分为模型定义、代码实现验证、物理模型确认和数值分析案例；这些栏目提供不同层次的证据。\nNACA 0012 案例包含几何约定、网格、Cp/Cf/CL/CD、典型输入与实验来源。本网站冻结了其中 CFL3D / SA 的小型压力与总力文件，并用独立 Python 复算；没有重新运行 CFD。\n选择验证对象前，应先对齐 Mach 数、Reynolds 数、湍流模型版本、转捩或绊线条件、参考面积和积分方向。某份参考结果可能仍有离散误差，不宜把网站中的单条曲线称为无误差真值。',tags:['CFD','湍流模型','验证数据','NACA 0012'],language:'HTML · DAT · PLOT3D · 求解器配置',license:'公开技术资料；遵循每份数据、论文及软件的来源和引用要求',url:tmr,docsUrl:tmr+'naca0012_val.html',sourceTitle:'NASA · TMR 迁移公告 / Turbulence Model Benchmarking Working Group',verifiedOn:'2026-10-29',workflow:['流体与气动','气动数据库','验证与不确定性'],inputs:'研究问题、模型名称、工况、网格及希望验证的物理量。',outputs:'模型方程、网格、Cp/Cf/积分系数、参考配置与原始实验资料。',limitations:'不同案例未必提供相同网格或误差估计；计算参考与风洞条件不可混为同一真值。',accessModel:'data',alternatives:['su2','fun3d','ansys-fluent','openfoam'],starterWorkflowStatus:'NACA 0012 的压力文件已在本站实际下载并进行后处理复算；未运行外部 CFD。',starterWorkflow:['先读 NACA 0012 工况页，确认这是闭合并缩放过的翼型，最大相对厚度约 11.894%，而非直接使用钝尾缘标准公式。','进入 SA 结果页，同时取 n0012cp_cfl3d_sa.dat 与 n0012clcd_cfl3d_sa.dat；前者是 3 个 zone，每个 513 行 x/c 与 Cp，后者是各迎角的总 CL/CD。','保留下表面尾缘→前缘→上表面尾缘的点序。原 Cp 文件不含 y/c，做轴向力积分必须取得对应几何或明确说明重建方法。','运行本站独立脚本，并用 10° 的 CLp≈1.090921、CDp≈0.006123 检查后处理。总 CD≈0.012311 包含其他力贡献，不能拿来要求压力积分强制吻合。','做 CFD 网格研究时转到 Numerical Analysis 栏目；对同一 Cp 文件抽稀只是积分采样敏感性，不属于网格收敛。'],starterWorkflowSources:[{title:'NASA 官方迁移公告',url:'https://www.nasa.gov/nasa-turbulence-modeling-resource/'},{title:'TMR · NACA 0012 SA 结果',url:tmr+'naca0012_val_sa.html'},{title:'TMR · NACA 0012 数值分析',url:tmr+'naca0012numerics_val.html'}],usageEvidence:[{organization:'NASA Langley / TMBWG',context:'公开案例展示多套 CFD 程序的 SA 结果，并提供 CFL3D 表面数据与典型配置；属于基准资料，不是本站求解器运行记录。',sourceUrl:tmr+'naca0012_val_sa.html',evidenceType:'公开基准与代码对照'}]};
const old=resources.findIndex(r=>r.id===record.id);if(old<0)resources.push(record);else resources[old]=record;
await write('research/library.json',resources);
await write('research/resource-review-v13.json',{reviewedOn:'2026-10-29',scope:'官方数据与输入接口复核；未运行商业或开源外部 CFD',resources:[...Object.keys(updates),record.id],sources:[...Object.values(updates).flatMap(x=>x.starterWorkflowSources),...record.starterWorkflowSources]});
const sources=await read('research/intelligence-sources-v9.json');
const source={id:'tmr',name:'TMBWG / NASA · Turbulence Modeling Resource',url:tmr,type:'软件与数据',region:['美国','国际'],language:['英文'],topics:['湍流模型','CFD 验证','参考数据','网格'],evidenceRole:'official',description:'追踪模型方程、更正、公开案例与基准文件；NASA 已确认新站迁至 TMBWG 的 GitHub Pages。',whatToLookFor:['模型命名与公式修订、验证网格和数据替换','工况、代码版本、边界条件以及参考结果的已知误差'],queryExamples:['site:tmbwg.github.io/turbmodels "Last Updated" "SA"','site:tmbwg.github.io/turbmodels "NACA 0012"'],checks:['数据更换须重新记录文件哈希，不能只刷新页面日期','区分实现验证、物理确认和后处理；不能把参考曲线视作无误差真值'],cadence:'每月；正在复算的案例更新时加查',reviewedOn:'2026-10-29',accessNote:'公开 HTML 与数据文件；大文件可能另在 NASA 下载页。',status:'active',verification:{method:'page-read',note:'已读 NASA 迁移公告、NACA 工况与 SA 结果页，实际下载 Cp/CLCD/配置文件并复算。'},matchPrefixes:['/turbmodels/']};
const si=sources.findIndex(s=>s.id==='tmr');if(si<0)sources.push(source);else sources[si]=source;
await write('research/intelligence-sources-v9.json',sources);
const maintenance=await read('research/intelligence-maintenance-v9.json');maintenance.reviewedOn='2026-10-29';if(!maintenance.history.some(h=>h.change.startsWith('v13：')))maintenance.history.push({date:'2026-10-29',change:'v13：新增 TMR 基准数据来源，按 NASA 公告更新现用 TMR 深链；冻结 NACA 0012 原始压力与总力文件，增加三套软件的输入及后处理流程。'});await write('research/intelligence-maintenance-v9.json',maintenance);
