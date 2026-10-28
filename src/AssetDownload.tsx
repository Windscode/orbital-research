import {useState} from 'react';
/** Download local published assets through a Blob, including in embedded browsers. */
export default function AssetDownload({href,name,className,children}:{href:string;name?:string;className?:string;children:React.ReactNode}){
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 return <><a href={href} download={name||true} className={className} aria-busy={busy} onClick={async event=>{
  event.preventDefault();if(busy)return;setBusy(true);setNotice('');
  try{
   const response=await fetch(href);if(!response.ok)throw new Error('Asset unavailable');
   const blob=await response.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download=name||new URL(href,location.href).pathname.split('/').at(-1)||'download';a.click();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch{setNotice('下载失败，请重试或查看原始资料。');}finally{setBusy(false);}
 }}>{children}</a>{notice&&<span role="status" className="asset-download-status">{notice}</span>}</>;
}
