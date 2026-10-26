import {useRef,useState} from 'react';
import {ArrowUpFromLine,Check,FileJson,X} from 'lucide-react';
import {MAX_STUDY_IMPORT_BYTES,mergeStudyArchive,parseStudyArchive} from './reading';
import type {StudyEntries} from './reading';
export default function StudyArchive({entries,labels,onRestore}:{entries:StudyEntries;labels:Map<string,string>;onRestore:(entries:StudyEntries)=>{ok:boolean;added:number;kept:number}}){
 const [open,setOpen]=useState(false),[preview,setPreview]=useState<ReturnType<typeof parseStudyArchive>|null>(null),[error,setError]=useState(''),[feedback,setFeedback]=useState(''),[filename,setFilename]=useState('');
 const request=useRef(0);
 const merge=preview?mergeStudyArchive(entries,preview.entries):null;
 async function choose(file?:File){
  const token=++request.current;setPreview(null);setError('');setFeedback('');setFilename(file?.name||'');if(!file)return;
  try{if(file.size>MAX_STUDY_IMPORT_BYTES)throw new Error('文件超过 8 MiB，请选择较小的学习记录文件。');const text=await file.text();if(token!==request.current)return;setPreview(parseStudyArchive(text,new Set(labels.keys())));}
  catch(e){if(token===request.current)setError(e instanceof Error?e.message:'文件读取失败。');}
 }
 function restore(){if(!preview)return;const result=onRestore(preview.entries);if(result.ok){setFeedback(`恢复完成：新增 ${result.added} 条，保留本地已有 ${result.kept} 条。`);setPreview(null);}else setError('浏览器存储无法写入，恢复未应用。原有记录保持不变，可稍后重试或先导出备份。');}
 return <section className="study-archive"><button className="text-link" aria-expanded={open} onClick={()=>setOpen(!open)}><ArrowUpFromLine size={15}/>恢复学习记录</button><span>从备份恢复已读状态、笔记与研究检查进度。</span>{open&&<div className="study-import-panel"><div><h3><FileJson size={19}/>从本地 JSON 恢复</h3><button className="icon-button" onClick={()=>setOpen(false)} aria-label="关闭恢复面板"><X size={17}/></button></div><p>仅新增当前没有的条目，已有笔记与已读状态始终保留；无法识别的条目会跳过。文件只在浏览器内读取，不上传。</p><label className="study-file-label">选择本站导出的学习记录（不超过 8 MiB）<input type="file" accept=".json,application/json" aria-label="选择学习记录 JSON" onChange={e=>{void choose(e.target.files?.[0]);e.target.value='';}}/></label>{error&&<p className="study-import-error" role="alert">{error}</p>}{preview&&merge&&<div className="study-import-preview"><strong>{filename}</strong><div className="study-import-counts"><span><b>{merge.added}</b> 可新增</span><span><b>{merge.kept}</b> 保留本地</span><span><b>{preview.unknownIds.length}</b> 未知条目跳过</span></div><ul>{Object.entries(preview.entries).slice(0,8).map(([id,item])=><li key={id}><span>{labels.get(id)}</span><small>{Object.hasOwn(entries,id)?'保留本地':`${item.completed?'已读 / 已检查':'未读'}${item.note?' · 含笔记':''}`}</small></li>)}</ul>{Object.keys(preview.entries).length>8&&<small>另有 {Object.keys(preview.entries).length-8} 条记录。</small>}{preview.unknownIds.length>0&&<details><summary>查看未知条目 ID</summary><p>{preview.unknownIds.join('、')}</p></details>}<button className="button primary" disabled={!merge.added} onClick={restore}><Check size={15}/>确认恢复 {merge.added} 条新记录</button><p className="study-import-hint">应用时会重新读取本地记录，保留其他标签页刚刚保存的内容。若全部条目已存在，无需重复导入。</p></div>}{feedback&&<p role="status" className="study-note-feedback">{feedback}</p>}</div>}</section>;
}
