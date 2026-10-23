import {estimatedOutputSize} from './output-size.js';
const $=selector=>document.querySelector(selector);
const fields={audio:$('#audio-input'),images:$('#images-input')},files={};
let busy=false,resetting=false,generation=0,currentJobId=null,currentProjectId=null,activeUpload=null,stopping=false;
let currentRender=null,pauseChanging=false,selectedDuration=null;
const formatBytes=bytes=>bytes>1024**3?(bytes/1024**3).toFixed(1)+' GB':(bytes/1024**2).toFixed(1)+' MB';
const clock=seconds=>seconds>=3600?`${Math.floor(seconds/3600)} h ${String(Math.floor(seconds/60)%60).padStart(2,'0')} min`:`${Math.floor(seconds/60)} min ${String(Math.floor(seconds%60)).padStart(2,'0')} s`;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function api(url,options){const response=await fetch(url,{cache:'no-store',...options});const data=await response.json();if(!response.ok){const error=Error(data.error||'The server is not responding.');error.status=response.status;throw error;}return data;}
function progress(value,message,detail=''){$('#progress').value=value;$('#percent').textContent=Math.round(value)+'%';$('#status').textContent=message;$('#detail').textContent=detail;}
function updateOutputSize(job){
 const size=estimatedOutputSize(job);$('#output-size').hidden=!size;
 if(size){const gb=size.bytes/1_000_000_000,small=gb<.01;const value=(small?size.bytes/1_000_000:gb).toLocaleString('en-US',{maximumFractionDigits:small?1:gb<1?2:1});$('#output-size-value').textContent=(size.estimated?'Approx ':'File size: ')+value+(small?' MB':' GB');
  $('#output-size').title=size.estimated?'Estimated total file size at approximately 2 GB per 10 minutes. Actual size depends on the visuals.':'Final MP4 file size.';}
}
function setBusy(value){busy=value;const disabled=value||resetting,paused=value&&currentRender?.status==='paused';Object.values(fields).forEach(f=>f.disabled=disabled);document.querySelectorAll('.import').forEach(b=>b.disabled=disabled);$('#render').disabled=disabled||!files.audio||!files.images;$('#render-label').textContent=value?(paused?'Render paused':'Rendering…'):'Render video';$('#stop').disabled=resetting||!value||stopping;$('#clear-cache').disabled=disabled;
 $('#pause').disabled=!value||resetting||stopping||pauseChanging||!currentRender?.pauseSupported||!['rendering','paused'].includes(currentRender.status);
 $('#pause-label').textContent=paused?'Resume':'Pause';$('#pause-icon').setAttribute('d',paused?'M4 2v12l9-6z':'M4 3h3v10H4zm5 0h3v10H9z');
 $('#pause').title=value&&currentJobId&&!currentRender?.pauseSupported?'Pause is available for new renders after the server update.':paused?'Continue this render from the same frame':'Pause after the current frame; the encoder may take a few seconds to settle.';
}
function resetSelection(){
 generation++;currentJobId=null;currentProjectId=null;currentRender=null;pauseChanging=false;selectedDuration=null;stopping=false;
 for(const key of ['musicframe-render-render-job','musicframe-render-render-project','musicframe-render-project','musicframe-render-export'])localStorage.removeItem(key);
 for(const kind of ['audio','images']){delete files[kind];fields[kind].value='';$('#'+kind+'-name').textContent='';$('#'+kind+'-button').classList.remove('selected','drag');}
 $('#result').hidden=true;$('#download').removeAttribute('href');$('#result-detail').textContent='';$('#error').hidden=true;
 $('#output-size').hidden=true;
}
function fail(error){$('#error').textContent=error.message;$('#error').hidden=false;$('#status').textContent='Operation interrupted';setBusy(false);}
function select(kind,file){
 if(busy||resetting||!file)return;const valid=kind==='audio'?/\.(wav|mp3)$/i.test(file.name):/\.zip$/i.test(file.name);
 if(!valid){fail(Error(kind==='audio'?'Choose a WAV or MP3 file.':'Choose a ZIP archive of images.'));return;}
 if(file.size>16*1024**3){fail(Error('The file exceeds the 16 GB limit.'));return;}
 files[kind]=file;$('#'+kind+'-name').textContent=file.name+' · '+formatBytes(file.size);$('#'+kind+'-button').classList.add('selected');$('#error').hidden=true;$('#result').hidden=true;
 if(kind==='audio'){
  selectedDuration=null;
  const audio=new Audio(),url=URL.createObjectURL(file);let cleaned=false;audio.preload='metadata';
  const cleanup=()=>{if(cleaned)return;cleaned=true;URL.revokeObjectURL(url);audio.removeAttribute('src');audio.load();};
  audio.addEventListener('loadedmetadata',()=>{if(files.audio===file){selectedDuration=audio.duration;if(!busy)updateOutputSize({status:'starting',durationSeconds:selectedDuration});}cleanup();},{once:true});
  audio.addEventListener('error',cleanup,{once:true});audio.src=url;
 }
 updateOutputSize({status:'starting',durationSeconds:selectedDuration});
 progress(0,files.audio&&files.images?'Ready to render':'Add your audio and images to get started');setBusy(false);
}
for(const kind of ['audio','images']){
 const button=$('#'+kind+'-button');button.addEventListener('click',()=>fields[kind].click());fields[kind].addEventListener('change',()=>select(kind,fields[kind].files[0]));
 button.addEventListener('dragover',e=>{e.preventDefault();if(!busy)button.classList.add('drag');});button.addEventListener('dragleave',()=>button.classList.remove('drag'));
 button.addEventListener('drop',e=>{e.preventDefault();button.classList.remove('drag');select(kind,e.dataTransfer.files[0]);});
}
function upload(){return new Promise((resolve,reject)=>{
 const form=new FormData();form.append('audio',files.audio);form.append('images',files.images);
 const xhr=new XMLHttpRequest();activeUpload=xhr;xhr.open('POST','/api/projects');xhr.setRequestHeader('X-Visualizer-Mode','production');
 xhr.upload.onprogress=e=>{if(e.lengthComputable)progress(e.loaded/e.total*100,'Uploading your files…',formatBytes(e.loaded)+' / '+formatBytes(e.total));};
 xhr.onabort=()=>reject(Error('Upload stopped.'));xhr.onloadend=()=>{activeUpload=null;};
 xhr.onerror=()=>reject(Error('Connection lost during upload.'));
 xhr.onload=()=>{let result;try{result=JSON.parse(xhr.responseText);}catch{reject(Error('Unable to read the server response.'));return;}if(xhr.status>=200&&xhr.status<300)resolve(result);else reject(Error(result.error||'Upload failed.'));};xhr.send(form);
});}
async function watchRender(id,token){
 currentJobId=id;
 if(stopping)await api('/api/exports/'+id+'/cancel',{method:'POST'});
 localStorage.setItem('musicframe-render-render-job',id);setBusy(true);
 let failures=0;
 while(token===generation){
  let job;try{job=await api('/api/exports/'+id);failures=0;}catch(error){if(error.status===404)throw error;if(++failures<=5){$('#detail').textContent='Reconnecting to the server…';await wait(2000);continue;}throw error;}
  currentRender=job;setBusy(true);updateOutputSize(job);
  if(job.status==='completed'){
   progress(100,'Your video is ready',clock(job.result.duration)+' · '+formatBytes(job.result.size));$('#result').hidden=false;$('#download').href=job.downloadUrl;
   $('#result-detail').textContent='MP4 · 1920 × 1080 · 60 fps · stereo';setBusy(false);return;
  }
  if(job.status==='cancelled'){localStorage.removeItem('musicframe-render-render-job');currentJobId=null;stopping=false;progress(0,'Render stopped');setBusy(false);return;}
  if(['error','interrupted'].includes(job.status)){localStorage.removeItem('musicframe-render-render-job');throw Error(job.error||'The render was interrupted.');}
  const paused=job.status==='paused';
  const detail=job.frames?job.frames.toLocaleString('en-US')+' / '+job.totalFrames.toLocaleString('en-US')+' frames'+(paused?' · Resume to continue. Keep the server running.':job.remainingSeconds>0?' · about '+clock(job.remainingSeconds)+' remaining':''):'';
  progress(job.totalFrames?job.frames/job.totalFrames*100:0,stopping?'Stopping the render…':paused?'Render paused':job.status==='encoding'?'Finishing your video…':'Rendering your video…',detail);await wait(1200);
 }
}
async function continueProject(project,token){
 currentProjectId=project.id;
 localStorage.setItem('musicframe-render-render-project',project.id);
 while(project.status==='processing'&&token===generation){progress(project.progress||0,project.message||'Preparing your media…');updateOutputSize({status:'starting',durationSeconds:project.audio?.duration});await wait(1200);project=await api('/api/projects/'+project.id);}
 if(project.status==='cancelled'){localStorage.removeItem('musicframe-render-render-project');stopping=false;progress(0,'Upload stopped');setBusy(false);return;}
 if(token!==generation)return;if(project.status!=='ready')throw Error(project.error||'Unable to prepare your files.');
 progress(0,'Preparing the render…');const job=await api('/api/projects/'+project.id+'/render',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
 localStorage.removeItem('musicframe-render-render-project');await watchRender(job.id,token);
}
$('#render').addEventListener('click',async()=>{
 if(busy||resetting||!files.audio||!files.images)return;currentJobId=null;currentProjectId=null;currentRender=null;stopping=false;const token=++generation;$('#error').hidden=true;$('#result').hidden=true;setBusy(true);progress(0,'Uploading your files…');
 $('#output-size').hidden=true;
 localStorage.removeItem('musicframe-render-render-job');localStorage.removeItem('musicframe-render-render-project');
 try{const project=await upload();if(token!==generation){await api('/api/projects/'+project.id+'/cancel',{method:'POST'}).catch(()=>{});return;}await continueProject(project,token);}catch(error){if(token===generation)fail(error);}
});
$('#pause').addEventListener('click',async()=>{
 if(!busy||stopping||pauseChanging||!currentJobId||!currentRender?.pauseSupported||!['rendering','paused'].includes(currentRender.status))return;
 const action=currentRender.status==='paused'?'resume':'pause';pauseChanging=true;setBusy(true);$('#error').hidden=true;
 try{const result=await api('/api/exports/'+currentJobId+'/'+action,{method:'POST'});currentRender.status=result.status;}
 catch(error){$('#error').textContent=error.message;$('#error').hidden=false;}
 finally{pauseChanging=false;setBusy(busy);}
});
$('#stop').addEventListener('click',async()=>{
 if(!busy||stopping)return;stopping=true;setBusy(true);
 try{if(activeUpload){generation++;activeUpload.abort();stopping=false;progress(0,'Upload stopped');setBusy(false);}
 else if(currentJobId)await api('/api/exports/'+currentJobId+'/cancel',{method:'POST'});
 else if(currentProjectId)await api('/api/projects/'+currentProjectId+'/cancel',{method:'POST'});
 }catch(error){stopping=false;fail(error);}
});
$('#clear-cache').addEventListener('click',async()=>{
 if(busy||resetting)return;
 if(!confirm('Delete all uploads, analysis, projects and generated videos? Your saved presets will be kept.'))return;
 resetting=true;setBusy(false);$('#error').hidden=true;progress(0,'Clearing your working files…');
 try{const result=await api('/api/cache/clear',{method:'POST'});resetSelection();progress(0,'Cache cleared',formatBytes(result.bytes)+' freed · Add your audio and images to get started');}
 catch(error){fail(error);}finally{resetting=false;setBusy(false);}
});
async function restore(){
 try{
  const state=await api('/api/service');if(!state.ready)throw Error('The video engine is unavailable on the server.');
  const projectId=localStorage.getItem('musicframe-render-render-project');
  const id=state.activeJob?.id||localStorage.getItem('musicframe-render-render-job')||(!projectId?state.latestCompletedJob?.id:null);
  if(id){await watchRender(id,++generation);return;}
  if(projectId){setBusy(true);await continueProject(await api('/api/projects/'+projectId),++generation);}
 }catch(error){if(error.status===404){resetSelection();progress(0,'Add your audio and images to get started');setBusy(false);}else fail(error);}
}
void restore();
