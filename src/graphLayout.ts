import type {KnowledgeGraphData} from './types';
export function layoutKnowledgeGraph(graph:KnowledgeGraphData,domain='all'){
 const domains=domain==='all'?graph.domains:graph.domains.filter(d=>d.id===domain),focused=domain!=='all',columns=focused?1:4,width=focused?900:1200;
 const groups:({id:string;label:string;color:string;description:string;x:number;y:number;width:number;height:number})[]=[],nodes:(KnowledgeGraphData['nodes'][number]&{x:number;y:number;color:string;width:number;height:number})[]=[];
 let y=20;
 for(let row=0;row<Math.ceil(domains.length/columns);row++){
  const batch=domains.slice(row*columns,(row+1)*columns),innerColumns=focused?3:2,gapY=focused?92:70;
  const height=Math.max(focused?300:260,...batch.map(d=>94+Math.ceil(graph.nodes.filter(n=>n.domain===d.id).length/innerColumns)*gapY));
  batch.forEach((d,col)=>{
   const x=focused?10:col*300+5,w=focused?880:290;groups.push({...d,x,y,width:w,height});
   graph.nodes.filter(n=>n.domain===d.id).forEach((n,i)=>nodes.push({...n,x:x+(focused?150:72)+(i%innerColumns)*(focused?290:145),y:y+100+Math.floor(i/innerColumns)*gapY,color:d.color,width:focused?238:128,height:focused?58:44}));
  });
  y+=height+20;
 }
 return {width,height:Math.max(360,y),focused,groups,nodes};
}
