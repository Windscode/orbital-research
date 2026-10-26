import {useEffect,useState,type ReactNode} from 'react';
export function save(data:unknown,name:string,type='application/json'){const url=URL.createObjectURL(new Blob([typeof data==='string'?data:JSON.stringify(data,null,2)],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export const number=(v:number,d=2)=>(Math.abs(v)<.5*10**(-d)?0:v).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
export function Field({name,value,min,max,step=1,unit='',onChange}:{name:string;value:number;min:number;max:number;step?:number;unit?:string;onChange:(n:number)=>void}){
 const format=(v:number)=>String(Number(v.toFixed(5))),[draft,setDraft]=useState(format(value));
 useEffect(()=>setDraft(format(value)),[value]);
 const commit=()=>{const parsed=draft.trim()?Number(draft):NaN,next=Number.isFinite(parsed)?Math.min(max,Math.max(min,parsed)):value;setDraft(format(next));if(next!==value)onChange(next);};
 return <label className="mission-field"><span>{name}<span><input aria-label={`${name}数值`} type="number" min={min} max={max} step={step} value={draft} onChange={e=>setDraft(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}/><small>{unit}</small></span></span><input aria-label={name} type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/></label>;
}
export function Metric({label,value,unit}:{label:string;value:string;unit?:string}){return <div className="mission-metric"><span>{label}</span><strong>{value}<small>{unit}</small></strong></div>;}
export function Assumptions({title,children}:{title:string;children:ReactNode}){return <div className="lab-assumptions"><strong>{title}</strong><p>{children}</p></div>;}
