/** Two 1 kg masses; three 100 N/m springs. Small, static displacement. */
export function modalStaticReference(force:readonly [number,number],modes:1|2){
 if(!force.every(Number.isFinite))throw new Error('载荷必须为有限值');
 const root2=Math.sqrt(2),p1=(force[0]+force[1])/root2,p2=(force[0]-force[1])/root2;
 const q1=p1/100,q2=modes===2?p2/300:0;
 const u1=(q1+q2)/root2,u2=(q1-q2)/root2;
 return {u1,u2,p1,p2,q1,q2,middleForce:100*(u1-u2),residual:[200*u1-100*u2-force[0],200*u2-100*u1-force[1]]};
}
