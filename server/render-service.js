import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {unlink} from 'node:fs/promises';
import {buildProductionSequence} from './production-sequence.js';
import {writeAtomicJson} from './atomic-json.js';
import {renderVideo} from './render.js';

export class RenderService {
  constructor({directory,baseUrl,jobs,savedSettings,publicProject}){Object.assign(this,{directory,baseUrl,jobs,savedSettings,publicProject});this.pending=new Set();}
  async start(project){
    const saved=await this.savedSettings.read(),sequence=buildProductionSequence(project,saved.presets),id=randomUUID();
    const job={id,kind:'production',projectId:project.id,name:project.name,status:'starting',progress:0,frames:0,totalFrames:Math.ceil(project.audio.duration*60),message:'Preparing the render',createdAt:new Date().toISOString(),fps:60,holdSeconds:sequence.segmentSeconds-sequence.transitionSeconds,transitionSeconds:sequence.transitionSeconds,effects:sequence.segments.length,durationSeconds:project.audio.duration};
    const manifest={projectId:project.id,sequence,settingsHash:createHash('sha256').update(JSON.stringify(saved)).digest('hex')};
    await writeAtomicJson(path.join(this.directory,id+'.recipe.json'),manifest);
    await writeAtomicJson(path.join(this.directory,id+'.json'),job);this.jobs.set(id,job);
    const task=this.run(job,project,sequence);this.pending.add(task);void task.finally(()=>this.pending.delete(task));return job;
  }
  async run(job,project,sequence){
    const output=path.join(this.directory,job.id+'.mp4');let writing=Promise.resolve();
    const persist=()=>{const snapshot={...job,cancel:undefined};writing=writing.catch(()=>{}).then(()=>writeAtomicJson(path.join(this.directory,job.id+'.json'),snapshot));return writing;};
    const timer=setInterval(()=>{void persist().catch(error=>console.error('Suivi du rendu : '+error.message));},2500);
    try{
      const options={job,project:{...this.publicProject(project),audioPath:project.audioPath},config:sequence.segments[0].config,output,baseUrl:this.baseUrl,sequence,hardware:'auto',raw:true,youtube:true};
      try{job.result=await renderVideo(options);}
      catch(error){
        if(job.cancelRequested||!/nvenc|cuda|device|webgl|gpu|context|encoder/i.test(error.message))throw error;
        job.fallbackReason=error.message;job.frames=0;job.progress=0;job.message='Retrying the render';
        job.result=await renderVideo({...options,hardware:false,videoEncoder:'cpu'});
      }
      job.status='completed';job.progress=100;job.message='Your video is ready';job.downloadUrl=`/api/exports/${job.id}/download`;
    }catch(error){job.status=job.cancelRequested?'cancelled':'error';job.error=error.message;job.message=job.cancelRequested?'Render cancelled':'Rendering failed';await unlink(output).catch(()=>{});}
    finally{clearInterval(timer);await persist().catch(error=>console.error('Sauvegarde du rendu : '+error.message));}
  }
}
