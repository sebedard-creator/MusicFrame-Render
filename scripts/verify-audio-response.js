import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {sampleResponse,adaptiveMode} from '../public/audio-response.js';
const state=await(await fetch('http://127.0.0.1:5180/api/service')).json();
const id=process.argv[2]||state.latestCompletedJob?.projectId;
if(!id)throw Error('Aucun morceau test disponible.');
const analysis=JSON.parse(await readFile(path.join('data/projects',id,'analysis.json'),'utf8'));
if(analysis.version===2){const buffer=await readFile(path.join('data/projects',id,analysis.envelopesFile)),data=new Uint16Array(buffer.buffer,buffer.byteOffset,buffer.byteLength/2);analysis.frames=new Proxy({length:analysis.count},{get:(t,k)=>k==='length'?t.length:Array.from(data.subarray(Number(k)*4,(Number(k)+1)*4),v=>v/1000)});}
const report={projectId:id,frames:analysis.frames.length,scenarios:[]};
for(const gain of [1.9,2.45,3]){
 const before=[[],[],[],[]],after=[[],[],[],[]];
 for(let frame=0;frame<analysis.frames.length;frame++){const raw=analysis.frames[frame],a=sampleResponse(analysis,frame/analysis.fps,gain),b=sampleResponse(analysis,frame/analysis.fps,gain,adaptiveMode);for(let band=0;band<4;band++)if(raw[band]>.03){before[band].push(a[band]);after[band].push(b[band]);}}
 const stats=(values,ceiling)=>{values.sort((a,b)=>a-b);const q=p=>values[Math.floor((values.length-1)*p)];return {ceilingFraction:values.filter(v=>v>=ceiling).length/values.length,p10:q(.1),median:q(.5),p90:q(.9)};};
 report.scenarios.push({gain,bands:[0,1,2,3].map(band=>({band,legacy:stats(before[band],1.5),adaptive:stats(after[band],1)}))});
}
await mkdir('test-output/rebrand-response',{recursive:true});await writeFile('test-output/rebrand-response/audio-response.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
