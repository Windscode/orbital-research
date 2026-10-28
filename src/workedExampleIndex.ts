export const workedExamples=[
 {id:'thermal-contact',code:'01',title:'两热容接触换热',subtitle:'解析解、时间步与能量残差',summary:'总能量守恒，温度仍可能算错。比较解析解和显式 Euler，观察时间步越过稳定边界后的变化。',lessonIds:['thermal-control','numerical-integration','verification-uncertainty'],resourceIds:['thermal-desktop','esatan','comsol-multiphysics','mfem'],vehicleIds:[],dossierIds:['thermal-power-coupling']},
 {id:'radiative-balance',code:'02',title:'单面散热板热平衡',subtitle:'太阳、反照与地球红外',summary:'逐项计算吸收功率，再求平衡温度。区分太阳吸收率与红外发射率，检查面积、朝向和环境输入。',lessonIds:['thermal-control','radiative-view-factors','eclipse-illumination'],resourceIds:['thermal-desktop','esatan','comsol-multiphysics'],vehicleIds:['jwst','parker-solar-probe'],dossierIds:['thermal-power-coupling']},
 {id:'mass-distribution',code:'03',title:'Sputnik 1 的惯量估算',subtitle:'Sputnik 1 · 三种质量分布假设',summary:'同样的质量和直径，可以得到不同的惯性张量。从理想球体出发，再移动一对内部质量，计算姿态响应的变化。',lessonIds:['mass-properties','six-dof','attitude-control'],resourceIds:['basilisk','freecad'],vehicleIds:['sputnik-1'],dossierIds:['geometry-mass-dynamics']}
];
export const exampleHref=(id:string)=>`#/research?view=examples&case=${id}`;
