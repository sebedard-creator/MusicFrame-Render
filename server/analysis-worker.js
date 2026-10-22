import { parentPort, workerData } from 'node:worker_threads';
import { analyzeAudio } from './media.js';
const controller=new AbortController();parentPort.on('message',message=>{if(message==='cancel')controller.abort();});
try {
  await analyzeAudio(workerData.audioPath, workerData.directory, workerData.duration,{signal:controller.signal,...(process.env.VISUALIZER_PACKED_ANALYSIS==='1'?{packed:true}:{})});
  parentPort.postMessage({ ok: true });
} catch (error) { parentPort.postMessage({ error: error.message }); }
finally{parentPort.close();}
