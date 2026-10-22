import {mkdir,readFile,writeFile,unlink,rmdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {analyzeAudio,command,ffmpeg,inspectAudio} from '../server/media.js';
import {buildProductionSequence} from '../server/production-sequence.js';
import {renderVideo} from '../server/render.js';
const id=randomUUID(),directory=path.resolve('data/projects',id);await mkdir(directory,{recursive:true});
const base='http://127.0.0.1:5180',reference=(await(await fetch(base+'/api/reference')).json()).project;
const audioPath=path.join(directory,'audio.wav'),started=performance.now();
await command(ffmpeg,['-v','error','-y','-f','lavfi','-i','sine=frequency=440:sample_rate=8000','-t','3900','-c:a','pcm_s16le',audioPath]);
const audio=await inspectAudio(audioPath);console.log('WAV réel de 65 minutes prêt. Analyse par blocs…');
let peakRss=process.memoryUsage().rss;const timer=setInterval(()=>{peakRss=Math.max(peakRss,process.memoryUsage().rss);},1000);
try{
 const analysis=await analyzeAudio(audioPath,directory,audio.duration);console.log('Analyse terminée : '+analysis.count+' mesures.');
 const saved=JSON.parse(await readFile('data/saved-settings.json','utf8')).presets;
 const project={...reference,id,audio:{...audio,duration:.05},audioPath,analysisUrl:`/api/projects/${id}/analysis.json`},sequence=buildProductionSequence(project,saved),job={};
 const output=path.resolve('test-output/optimization/long-track-61min.mp4');
 const result=await renderVideo({job,project,config:sequence.segments[0].config,sequence,output,baseUrl:base,hardware:'auto',raw:true,youtube:true,startTime:3661});
 const report={sourceDuration:audio.duration,analysisFrames:analysis.count,analysisVersion:analysis.version,peakResidentMB:Math.round(peakRss/1024**2),elapsedSeconds:(performance.now()-started)/1000,renderAtSeconds:3661,result,job};
 await writeFile('test-output/optimization/long-track.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{clearInterval(timer);for(const name of ['audio.wav','analysis.json','envelopes.bin','spectrum.bin','analyzer.bin','analysis.pcm','stereo-spectrum.pcm','spectrum.tmp'])await unlink(path.join(directory,name)).catch(()=>{});await rmdir(directory);}
