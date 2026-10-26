import assert from 'node:assert/strict';
import {readFile, readdir, mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import os from 'node:os';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const localRequire = createRequire(import.meta.url);
const bundleRequire = createRequire(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/placeholder.js'));
const getPackage = name => { try { return localRequire(name); } catch { return bundleRequire(name); } };
const sharp = getPackage('sharp');
const {createCanvas, GlobalFonts} = getPackage('@napi-rs/canvas');
if (process.platform === 'win32') GlobalFonts.registerFromPath('C:/Windows/Fonts/msyh.ttc', 'Microsoft YaHei');
const ctx = createCanvas(2,2).getContext('2d');
const directory = path.join(root,'public/images/diagrams');
const preview = path.join(directory,'..','..','..','test-results','diagram-preview');
await mkdir(preview,{recursive:true});
const media=JSON.parse(await readFile(path.join(root,'research/media-diagrams.json'),'utf8'));
const lessonIds=new Set(JSON.parse(await readFile(path.join(root,'research/learning.json'),'utf8')).map(x=>x.id));
assert.equal(media.length,12);
assert.equal(new Set(media.map(x=>x.id)).size,media.length);
const report={diagrams:0,textLabels:0,textOutOfBounds:[],textOverlap:[],assets:[]};
const decode=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;/g,"'");
const attrs=s=>Object.fromEntries([...s.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m=>[m[1],decode(m[2])]));
for(const entry of media){
  for(const k of ['id','title','src','alt','caption','credit','sourceUrl','assetUrl','kind','licenseNote','verifiedOn']) assert.ok(typeof entry[k]==='string'&&entry[k].length>0,entry.id+': '+k);
  assert.equal(new URL(entry.sourceUrl).protocol,'https:');
  assert.equal(entry.assetUrl,entry.src);
  assert.equal(entry.verifiedOn,'2026-10-25');
  assert.ok(entry.lessonIds.length>0);
  entry.lessonIds.forEach(id=>assert.ok(lessonIds.has(id),entry.id+': unknown lesson '+id));
  const filename=path.basename(entry.src);
  assert.equal(entry.src,'/images/diagrams/'+filename);
  const svg=await readFile(path.join(directory,filename),'utf8');
  assert.match(svg,/viewBox="0 0 1400 (800|900)"/);
  assert.match(svg,/<title[^>]*>[^<]+<\/title>/);
  assert.match(svg,/<desc[^>]*>[^<]+<\/desc>/);
  assert.doesNotMatch(svg,/<(?:script|foreignObject|image)\b/i);
  assert.doesNotMatch(svg,/(?:href|src)="https?:/i);
  const stack=[{'font-size':'24','font-family':'Microsoft YaHei','text-anchor':'start'}];
  const boxes=[];
  const tokens=[...svg.matchAll(/<[^>]+>|[^<]+/g)];
  for(let i=0;i<tokens.length;i++){
    const tag=tokens[i][0];
    if(tag.startsWith('</')) { if(!/^<\/(?:text|title|desc)>/.test(tag)) stack.pop(); continue; }
    if(!tag.startsWith('<')||tag.startsWith('<?')||tag.startsWith('<!')) continue;
    const name=tag.match(/^<([\w:-]+)/)?.[1];
    const a={...stack.at(-1),...attrs(tag)};
    if(name==='text'){
      let value='';
      while(i+1<tokens.length&&!tokens[i+1][0].startsWith('</text')) value+=tokens[++i][0];
      i++;
      assert.ok(!value.includes('<'),filename+': text checker expects simple text');
      value=decode(value);
      const size=Number(a['font-size']);
      const x=Number(a.x),y=Number(a.y);
      assert.ok([size,x,y].every(Number.isFinite),filename+': nonfinite text');
      ctx.font=(a['font-weight']||'400')+' '+size+'px "Microsoft YaHei"';
      const metrics=ctx.measureText(value);
      const spacing=Number(a['letter-spacing']||0);
      const width=metrics.width+Math.max(0,[...value].length-1)*spacing;
      const anchor=a['text-anchor']||'start';
      const left=x-(anchor==='end'?width:anchor==='middle'?width/2:0);
      const top=y-metrics.actualBoundingBoxAscent;
      const box={text:value,left,top,right:left+width,bottom:y+metrics.actualBoundingBoxDescent};
      if(box.left<0||box.top<0||box.right>1400||box.bottom>Number(svg.match(/viewBox="0 0 1400 (\d+)"/)[1])) report.textOutOfBounds.push({filename,...box});
      boxes.push(box);
      report.textLabels++;
    }else if(!tag.endsWith('/>')&&!['title','desc'].includes(name)){stack.push(a);}
    else if(['title','desc'].includes(name)){while(i+1<tokens.length&&!tokens[i+1][0].startsWith('</'+name))i++;i++;}
  }
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
    const a=boxes[i],b=boxes[j];
    if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>2&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>2)report.textOverlap.push({filename,a:a.text,b:b.text});
  }
  const png=path.join(preview,filename.replace('.svg','.png'));
  await sharp(Buffer.from(svg)).png().toFile(png);
  report.assets.push({filename,width:1400,height:Number(svg.match(/viewBox="0 0 1400 (\d+)"/)[1]),labels:boxes.length});
  report.diagrams++;
}
for(let p=0;p<Math.ceil(media.length/4);p++){
 const group=media.slice(p*4,p*4+4);
 const tiles=await Promise.all(group.map(async(e,i)=>({input:await sharp(path.join(preview,path.basename(e.src).replace('.svg','.png'))).resize(700,450,{fit:'contain',background:'#10191e'}).toBuffer(),left:(i%2)*700,top:Math.floor(i/2)*450})));
 await sharp({create:{width:1400,height:900,channels:4,background:'#10191e'}}).composite(tiles).png().toFile(path.join(preview,'contact-'+(p+1)+'.png'));
}
await writeFile(path.join(preview,'qa-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
assert.equal(report.textOutOfBounds.length,0,'Text outside artboard');
assert.equal(report.textOverlap.length,0,'Text labels overlap');
