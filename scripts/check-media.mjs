/**
 * Validate curated research images without network requests or mutations.
 * Run: node scripts/check-media.mjs
 * Checks paths, metadata, associations, provenance records and file structure.
 * Source/rights statements still require the documented human/source review.
 */
import assert from 'node:assert/strict';
import {readFile, readdir, realpath, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const research=path.join(root,'research');
const publicRoot=await realpath(path.join(root,'public'));
const today=new Date().toISOString().slice(0,10);
const readJson=async filename=>JSON.parse(await readFile(path.join(research,filename),'utf8'));
const researchFiles=await readdir(research);
const mediaFiles=researchFiles.filter(name=>/^media-[a-z0-9-]+\.json$/.test(name)).sort();
assert.ok(mediaFiles.length>0,'No media manifests found');
const vehicleIds=new Set((await readJson('vehicles.json')).map(x=>x.id));
const lessonIds=new Set((await readJson('learning.json')).map(x=>x.id));
const kinds=new Set(['实拍影像','官方示意','原理图解','生成概念']);
const allIds=new Set(), allSources=new Set(), media=[];
const promptRecords=[];
for(const name of researchFiles.filter(name=>/^visual-assets(?:-[a-z0-9-]+)?\.json$/.test(name))){
  const doc=await readJson(name);
  for(const asset of doc.assets??[]){
    if(typeof asset.prompt==='string') promptRecords.push({...asset,tool:asset.tool??doc.tool,date:asset.generatedOn??doc.createdOn,document:name});
  }
}
const stats={manifests:mediaFiles.length,items:0,kinds:{},formats:{},bytes:0,associations:{vehicleLinks:0,lessonLinks:0,vehicles:0,lessons:0},generatedPrompts:0,sourceUrls:0};
const associatedVehicles=new Set(), associatedLessons=new Set();
const errors=[];
const requireText=(value,label,min=1)=>assert.ok(typeof value==='string'&&value.trim().length>=min,label+' must be meaningful text');
const https=(value,label)=>{
 requireText(value,label);
 const url=new URL(value);
 assert.equal(url.protocol,'https:',label+' must use HTTPS');
 assert.ok(url.hostname.includes('.')&&!url.username&&!url.password,label+' must be a public, credential-free URL');
 assert.ok(!['localhost','127.0.0.1','[::1]'].includes(url.hostname),label+' must be public');
 return url;
};
const validDate=(value,label)=>{
 assert.match(value,/^\d{4}-\d{2}-\d{2}$/,label+' must be YYYY-MM-DD');
 const date=new Date(value+'T00:00:00.000Z');
 assert.ok(Number.isFinite(date.getTime()),label+' invalid date');
 assert.equal(date.toISOString().slice(0,10),value,label+' invalid calendar date');
 assert.ok(value<=today,label+' cannot be in the future');
};
const safeAsset=async src=>{
 assert.match(src,/^\/images\/[a-zA-Z0-9_./-]+\.(svg|png|jpe?g)$/,'Unexpected public image path');
 assert.ok(src.split('/').every(part=>part!=='.'&&part!=='..'),'Dot path segments forbidden');
 const file=path.resolve(publicRoot,src.slice(1));
 const relative=path.relative(publicRoot,file);
 assert.ok(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative),'Asset escapes public directory');
 const physical=await realpath(file);
 const physicalRelative=path.relative(publicRoot,physical);
 assert.ok(physicalRelative&&!physicalRelative.startsWith('..')&&!path.isAbsolute(physicalRelative),'Asset symlink escapes public directory');
 assert.ok((await stat(physical)).isFile(),'Asset is not a file');
 return physical;
};
const crcTable=Array.from({length:256},(_,n)=>{
 for(let k=0;k<8;k++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;
 return n>>>0;
});
const crc32=bytes=>{
 let c=0xffffffff;
 for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);
 return (c^0xffffffff)>>>0;
};
function inspectPng(bytes){
 assert.deepEqual(bytes.subarray(0,8),Buffer.from([137,80,78,71,13,10,26,10]),'PNG signature mismatch');
 let offset=8, width=0,height=0,idat=false,ended=false,chunks=0;
 while(offset<bytes.length){
  assert.ok(offset+12<=bytes.length,'Truncated PNG chunk header');
  const length=bytes.readUInt32BE(offset),end=offset+12+length;
  assert.ok(end<=bytes.length,'Truncated PNG chunk data');
  const type=bytes.toString('ascii',offset+4,offset+8);
  assert.equal(bytes.readUInt32BE(offset+8+length),crc32(bytes.subarray(offset+4,offset+8+length)),'Invalid PNG CRC: '+type);
  if(chunks===0){
   assert.equal(type,'IHDR');assert.equal(length,13);
   width=bytes.readUInt32BE(offset+8);height=bytes.readUInt32BE(offset+12);
   assert.equal(bytes[offset+18],0,'Invalid PNG compression method');
   assert.equal(bytes[offset+19],0,'Invalid PNG filter method');
   assert.ok(bytes[offset+20]<=1,'Invalid PNG interlace method');
  }
  if(type==='IDAT')idat=true;
  if(type==='IEND'){assert.equal(length,0);assert.equal(end,bytes.length,'Bytes after PNG IEND');ended=true;break;}
  offset=end;chunks++;
 }
 assert.ok(ended&&idat&&width>0&&height>0,'Missing PNG image data or dimensions');
 return {format:'png',width,height};
}
function inspectJpeg(bytes){
 assert.equal(bytes.readUInt16BE(0),0xffd8,'JPEG SOI signature mismatch');
 assert.equal(bytes.readUInt16BE(bytes.length-2),0xffd9,'JPEG EOI missing');
 let offset=2,width=0,height=0,sawScan=false;
 const sof=new Set([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf]);
 while(offset<bytes.length-2){
  assert.equal(bytes[offset++],0xff,'Invalid JPEG segment boundary');
  while(bytes[offset]===0xff)offset++;
  const marker=bytes[offset++];
  if(marker===0xda){sawScan=true;break;}
  if(marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;
  assert.ok(offset+2<=bytes.length,'Truncated JPEG segment');
  const length=bytes.readUInt16BE(offset);
  assert.ok(length>=2&&offset+length<=bytes.length,'Invalid JPEG segment size');
  if(sof.has(marker)){
   assert.ok(length>=8,'Invalid JPEG SOF');
   height=bytes.readUInt16BE(offset+3);width=bytes.readUInt16BE(offset+5);
  }
  offset+=length;
 }
 assert.ok(width>0&&height>0&&sawScan,'Missing JPEG image dimensions/scan');
 return {format:'jpeg',width,height};
}
function inspectSvg(bytes){
 const svg=bytes.toString('utf8');
 assert.ok(!svg.includes('\ufffd'),'SVG is not valid UTF-8');
 const rootTag=svg.match(/<svg\b[^>]*>/)?.[0];
 assert.ok(rootTag&&/<\/svg>\s*$/.test(svg),'Missing SVG root');
 assert.match(rootTag,/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
 const viewBox=rootTag.match(/\bviewBox="([^"]+)"/)?.[1].trim().split(/[\s,]+/).map(Number);
 assert.ok(viewBox?.length===4&&viewBox.every(Number.isFinite),'Invalid SVG viewBox');
 assert.deepEqual(viewBox.slice(0,2),[0,0],'Unexpected SVG coordinate origin');
 assert.equal(viewBox[2],1400,'Technical diagram width must remain 1400');
 assert.ok([800,900].includes(viewBox[3]),'Unexpected technical diagram height');
 assert.match(svg,/<title\b[^>]*>[^<]+<\/title>/,'SVG accessible title missing');
 assert.match(svg,/<desc\b[^>]*>[^<]+<\/desc>/,'SVG accessible description missing');
 assert.doesNotMatch(svg,/<(?:script|foreignObject|image)\b|<!DOCTYPE|<!ENTITY|\bon\w+\s*=/i,'SVG contains active or external content');
 assert.doesNotMatch(svg,/(?:href|src)="(?:https?:|\/\/|data:)/i,'SVG contains an external resource');
 const ids=[...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(new Set(ids).size,ids.length,'Duplicate SVG IDs');
 const refs=[...svg.matchAll(/url\(#([^)]+)\)/g)].map(m=>m[1]);
 for(const ref of refs)assert.ok(ids.includes(ref),'Missing SVG paint/marker reference '+ref);
 const labelledBy=rootTag.match(/\baria-labelledby="([^"]+)"/)?.[1]?.split(/\s+/)??[];
 assert.ok(labelledBy.length>=2,'SVG accessible label relationship missing');
 for(const id of labelledBy)assert.ok(ids.includes(id),'Missing aria-labelledby target '+id);
 return {format:'svg',width:viewBox[2],height:viewBox[3]};
}

for(const filename of mediaFiles){
 const rows=await readJson(filename);
 assert.ok(Array.isArray(rows),filename+' must contain an array');
 for(const row of rows){
  try{
   assert.match(row.id,/^[a-z0-9]+(?:-[a-z0-9]+)*$/,'Invalid media ID');
   assert.ok(!allIds.has(row.id),'Duplicate media ID '+row.id);allIds.add(row.id);
   for(const key of ['title','alt','caption','credit','licenseNote'])requireText(row[key],key,{alt:10,caption:20,licenseNote:8}[key]??1);
   assert.ok(kinds.has(row.kind),'Invalid media kind');
   assert.equal(typeof row.sourceUrl,'string','sourceUrl must be a string; generated concepts may leave it empty');
   validDate(row.verifiedOn,'verifiedOn');
   if(row.fit!==undefined)assert.ok(['contain','cover'].includes(row.fit),'Invalid image fit');
   if(row.focus!==undefined){
    const matches=row.focus.match(/^(\d+(?:\.\d+)?)% (\d+(?:\.\d+)?)%$/);
    assert.ok(matches&&matches.slice(1).every(x=>Number(x)>=0&&Number(x)<=100),'Invalid object-position focus');
   }
   for(const [key,known,related] of [['vehicleIds',vehicleIds,associatedVehicles],['lessonIds',lessonIds,associatedLessons]]){
    if(row[key]!==undefined){
     assert.ok(Array.isArray(row[key]),key+' must be an array');
     assert.equal(new Set(row[key]).size,row[key].length,key+' duplicates');
     for(const id of row[key]){assert.ok(known.has(id),'Unknown '+key+' reference '+id);related.add(id);}
    }
   }
   const archive=['实拍影像','官方示意'].includes(row.kind);
   if(archive){
    assert.ok(row.vehicleIds?.length>0,'Archive image requires a vehicle association');
    https(row.sourceUrl,'sourceUrl');https(row.assetUrl,'assetUrl');https(row.rightsUrl,'rightsUrl');
    assert.equal(row.fit,'contain','Reviewed archive images preserve the full frame');
   } else if(row.kind==='原理图解'){
    assert.ok(row.lessonIds?.length>0,'Diagram requires a lesson association');
    https(row.sourceUrl,'sourceUrl');
    assert.equal(row.assetUrl,row.src,'Original diagram asset must be local');
    assert.equal(path.extname(row.src),'.svg','Technical diagram must be SVG');
   } else {
    assert.equal(row.assetUrl,row.src,'Generated image must use its local asset');
    if(row.sourceUrl)https(row.sourceUrl,'sourceUrl');
    assert.match(row.credit,/ImageGen/i,'Generated asset tool attribution missing');
    assert.match(row.caption+row.licenseNote,/生成|AI|构想/,'Generated concept must be clearly described');
    const records=promptRecords.filter(record=>record.path==='public'+row.src);
    assert.equal(records.length,1,'Generated asset must have exactly one provenance/prompt record');
    requireText(records[0].prompt,'generation prompt',160);
    requireText(records[0].tool,'generation tool');
    validDate(records[0].date,'generation date');
    assert.ok(records[0].date<=row.verifiedOn,'Generation cannot postdate verification');
    stats.generatedPrompts++;
   }
   const file=await safeAsset(row.src);
   const bytes=await readFile(file);
   assert.ok(bytes.length>128,'Image is suspiciously small');
   const extension=path.extname(file).toLowerCase();
   const dimensions=extension==='.svg'?inspectSvg(bytes):extension==='.png'?inspectPng(bytes):inspectJpeg(bytes);
   assert.ok(dimensions.width>=400&&dimensions.height>=250,'Research image resolution too small');
   stats.items++;stats.bytes+=bytes.length;
   stats.kinds[row.kind]=(stats.kinds[row.kind]??0)+1;
   stats.formats[dimensions.format]=(stats.formats[dimensions.format]??0)+1;
   stats.associations.vehicleLinks+=row.vehicleIds?.length??0;
   stats.associations.lessonLinks+=row.lessonIds?.length??0;
   if(row.sourceUrl)allSources.add(row.sourceUrl);
   media.push({id:row.id,...dimensions});
  }catch(error){errors.push(filename+' / '+(row.id??'(missing id)')+': '+error.message);}
 }
}
stats.associations.vehicles=associatedVehicles.size;
stats.associations.lessons=associatedLessons.size;
stats.sourceUrls=allSources.size;
console.log(JSON.stringify(stats,null,2));
if(errors.length){for(const message of errors)console.error('FAIL '+message);process.exitCode=1;}
else console.log('PASS: all '+stats.items+' media assets, metadata, links and generation prompt records are consistent.');
