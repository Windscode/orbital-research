export const rangeDirections=[[1,0],[0,1],[-1,0],[0,-1],[.6,.8]];
export const rangeDifferences=[13,-1,-7,7,4];
/** Householder QR on the whitened system, not a normal-equation inverse. */
export function solveRangeBias({estimateBias=true,fourthSigma=2,identical=false}:{estimateBias?:boolean;fourthSigma?:number;identical?:boolean}={}){
 if(!Number.isFinite(fourthSigma)||fourthSigma<=0)throw new RangeError('Positive sigma required');
 const sigma=[1,1,2,fourthSigma,1],H=rangeDirections.map(u=>[...(identical?[1,0]:u),...(estimateBias?[1]:[])]),n=H[0].length;
 const A=H.map((r,i)=>r.map(v=>v/sigma[i])),b=rangeDifferences.map((v,i)=>v/sigma[i]);
 let rank=0;
 for(let k=0;k<n;k++){
  const v=A.slice(k).map(r=>r[k]),len=Math.hypot(...v);
  if(len<1e-10)continue;
  rank++;v[0]+=v[0]>=0?len:-len;const vn=Math.hypot(...v);for(let i=0;i<v.length;i++)v[i]/=vn;
  for(let j=k;j<n;j++){const proj=v.reduce((s,x,i)=>s+x*A[k+i][j],0);for(let i=0;i<v.length;i++)A[k+i][j]-=2*v[i]*proj;}
  const proj=v.reduce((s,x,i)=>s+x*b[k+i],0);for(let i=0;i<v.length;i++)b[k+i]-=2*v[i]*proj;
 }
 if(rank<n)return {status:'rank-deficient' as const,rank,H,sigma};
 const back=(rhs:number[])=>{const x=Array(n).fill(0) as number[];for(let i=n-1;i>=0;i--)x[i]=(rhs[i]-A[i].slice(i+1,n).reduce((s,v,j)=>s+v*x[i+1+j],0))/A[i][i];return x;};
 const x=back(b),inverseColumns=Array.from({length:n},(_,j)=>back(Array.from({length:n},(_,i)=>i===j?1:0)));
 const covariance=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>inverseColumns.reduce((s,c)=>s+c[i]*c[j],0)));
 const predictions=H.map(r=>r.reduce((s,v,j)=>s+v*x[j],0)),residuals=rangeDifferences.map((v,i)=>v-predictions[i]);
 return {status:'solved' as const,rank,H,sigma,x,covariance,parameterSigma:covariance.map((r,i)=>Math.sqrt(r[i])),predictions,residuals,objective:residuals.reduce((s,v,i)=>s+(v/sigma[i])**2,0),normalResidual:Array.from({length:n},(_,j)=>H.reduce((s,r,i)=>s+r[j]*residuals[i]/sigma[i]**2,0))};
}
export function gridConvergence(fine:number,middle:number,coarse:number,r=2){
 if(![fine,middle,coarse,r].every(Number.isFinite)||r<=1)throw new RangeError('Invalid refinement data');
 const e21=middle-fine,e32=coarse-middle;
 if(Math.min(Math.abs(e21),Math.abs(e32))<1e-12)return {status:'unresolved' as const,e21,e32};
 const R=e21/e32;
 if(R<0)return {status:'oscillatory' as const,R,e21,e32};
 if(R>=1||fine===0||middle===0)return {status:'nonconvergent' as const,R,e21,e32};
 const p=Math.log(e32/e21)/Math.log(r),rp=r**p,extrapolated=fine+(fine-middle)/(rp-1),gci=1.25*Math.abs(e21)/(Math.abs(fine)*(rp-1)),gci32=1.25*Math.abs(e32)/(Math.abs(middle)*(rp-1));
 return {status:'monotonic' as const,R,e21,e32,p,extrapolated,gci,gci32,absolute:gci*Math.abs(fine),ratio:gci32/(rp*gci)};
}
