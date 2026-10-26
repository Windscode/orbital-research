import {readFile,mkdir,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
const vehicles=JSON.parse(await readFile('research/vehicles.json','utf8'));
await mkdir('test-results/model-review-v8',{recursive:true});
for(let page=0;page<4;page++){
 const subset=vehicles.slice(page*14,page*14+14),composites=[];
 for(let i=0;i<subset.length;i++){
  const left=(i%7)*240,top=Math.floor(i/7)*245;
  composites.push({input:await sharp(`public/models/${subset[i].id}.webp`).resize(240,192).toBuffer(),left,top});
  composites.push({input:Buffer.from(`<svg width="240" height="53"><rect width="240" height="53" fill="#15283e"/><text x="12" y="24" fill="#c8d8ee" font-family="Arial" font-size="13">${subset[i].id}</text><text x="12" y="43" fill="#7898ba" font-family="Arial" font-size="10">${subset[i].model.kind}</text></svg>`),left,top:top+192});
 }
 await sharp({create:{width:1680,height:490,channels:3,background:'#0b1729'}}).composite(composites).png().toFile(`test-results/model-review-v8/sheet-${page+1}.png`);
}
await writeFile('test-results/model-review-v8/index.json',JSON.stringify({models:vehicles.map(v=>v.id),pages:4}));
console.log('Rendered four contact sheets of all 56 exported model previews.');
