import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { performance } from 'node:perf_hooks';
import { launchRenderBrowser } from './render-browser.js';
import { ffmpeg, command, ffprobe } from './media.js';
import { videoEncodingArgs } from './video-encoding.js';
import { rawFrameTransport } from './raw-frame-transport.js';
import { selectEncoder } from './render-capabilities.js';
import { frameSocket } from './frame-socket.js';
import { createRenderPause } from './render-pause.js';

export async function renderVideo({ job, project, config, output, baseUrl, startTime=0, sequence, hardware=false, captureFrame, raw=false, youtube=false, videoEncoder='auto', rawCompression=true, socket=true }) {
  if(!Number.isFinite(startTime)||startTime<0)throw new Error('Invalid render start time.');
  let browser,encoder,transport,pauseControl,stderr='',cancelled=false;
  job.cancel=()=>{cancelled=true;pauseControl?.dispose();encoder?.kill();browser?.close().catch(()=>{});};
  const cancelledError=()=>new Error('Export cancelled.');
  try{
    const renderErrors=[];
    async function prepare(useHardware){
      if(cancelled)throw cancelledError();
      renderErrors.length=0;
      browser=await launchRenderBrowser(useHardware);
      if(cancelled)throw cancelledError();
      const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
      page.setDefaultTimeout(0); // Long analysis loads and full-song calculations have no 30 s deadline.
      page.on('pageerror',e=>renderErrors.push(e.message));page.on('console',m=>{if(m.type()==='error')renderErrors.push(m.text());});
      await page.goto(baseUrl+'/render.html');await page.waitForFunction(()=>typeof window.initializeRender==='function');
      job.renderer=await page.evaluate(async({project,config,sequence})=>window.initializeRender(project,config,sequence),{project,config,sequence});
      return page;
    }
    let page;
    const useHardware=hardware==='auto'?process.env.VISUALIZER_GPU!=='off':hardware;
    try{page=await prepare(useHardware);}
    catch(error){if(hardware!=='auto'||!useHardware||cancelled)throw error;await browser?.close().catch(()=>{});page=await prepare(false);}
    if(cancelled)throw cancelledError();
    job.graphics=/swiftshader|llvmpipe|software/i.test(job.renderer.renderer)?'cpu':'gpu';
    job.encoder=youtube&&videoEncoder!=='cpu'?await selectEncoder():'libx264';job.transport=raw?(socket?'rgba-websocket':'raw-rgba'):'png';
    const input=raw?['-f','rawvideo','-pixel_format',socket&&!captureFrame?'rgb24':'rgba','-video_size','1920x1080','-framerate',String(config.fps)]:['-f','image2pipe','-vcodec','png','-framerate',String(config.fps)];
    const filters=[...(raw?['vflip']:[]),...(youtube?['scale=in_range=pc:out_range=tv:out_color_matrix=bt709','format=yuv420p']:[])];
    encoder=spawn(ffmpeg,['-v','error','-y',...input,'-i','pipe:0',...(startTime>0?['-ss',String(startTime)]:[]),'-t',String(project.audio.duration),'-i',project.audioPath,'-map','0:v:0','-map','1:a:0',...(filters.length?['-vf',filters.join(',')]:[]),...videoEncodingArgs(config.fps,{encoder:job.encoder,youtube}),'-c:a','aac','-b:a','384k','-ar','48000','-ac','2',...(youtube?['-use_editlist','0','-avoid_negative_ts','make_zero']:['-t',String(project.audio.duration)]),'-movflags','+faststart',output],{windowsHide:true,stdio:['pipe','ignore','pipe']});
    const completion=new Promise((resolve,reject)=>{encoder.on('error',reject);encoder.on('close',code=>code===0?resolve():reject(new Error(cancelled?'Export cancelled.':stderr||'Video encoding failed.')));});
    completion.catch(()=>pauseControl?.dispose());encoder.stdin.on('error',()=>{});encoder.stderr.on('data',data=>{stderr=(stderr+data).slice(-4000);});
    const total=Math.ceil(project.audio.duration*config.fps),started=performance.now();
    job.totalFrames=total;job.status='rendering';job.message='Rendering your video';
    pauseControl=createRenderPause(job);
    const markFrame=async()=>{
      if(cancelled)throw cancelledError();
      if(renderErrors.length)throw new Error('Rendering error: '+renderErrors.join('\n').slice(0,3000));
      job.frames=(job.frames||0)+1;job.progress=Math.round(job.frames/total*95);
      const elapsed=pauseControl.elapsed(started);job.renderFps=Math.round(job.frames/Math.max(.001,elapsed)*10)/10;
      job.remainingSeconds=job.frames>=30?Math.ceil((total-job.frames)/Math.max(.01,job.renderFps)):null;
      await pauseControl.wait();
      if(cancelled)throw cancelledError();
    };
    job.frames=0;
    if(raw&&!captureFrame){
      transport=socket?await frameSocket(encoder.stdin,new URL(baseUrl).origin,1920,1080,{onFrame:markFrame,channels:3}):await rawFrameTransport(encoder.stdin,new URL(baseUrl).origin,1920,1080,{onFrame:markFrame,compression:rawCompression});
      job.timings=await page.evaluate(async options=>options.socket?window.renderSocketFrames(options):window.renderRawFrames(options),{startTime,total,fps:config.fps,url:transport.url,compression:rawCompression,socket});
      if(transport.error)throw transport.error;
      if(job.frames!==total)throw new Error('Incorrect number of received frames.');
    }else{
    if(raw)transport=await rawFrameTransport(encoder.stdin,new URL(baseUrl).origin);
    for(let frame=0;frame<total;frame++){
      await pauseControl.wait();
      if(cancelled)throw cancelledError();
      const time=startTime+frame/config.fps;
      if(raw){
        const timing=await page.evaluate(async({time,url})=>window.pushRawFrame(time,url),{time,url:transport.url});
        job.timings??={drawing:0,readback:0,transfer:0};for(const key of Object.keys(job.timings))job.timings[key]+=timing[key];
        if(transport.error)throw transport.error;
        if(captureFrame){const encoded=await page.evaluate(time=>window.renderFrame(time),time);await captureFrame(frame,Buffer.from(encoded,'base64'));}
      }else{
        const encoded=await page.evaluate(async time=>window.renderFrame(time),time),frameData=Buffer.from(encoded,'base64');
        if(captureFrame)await captureFrame(frame,frameData);
        if(encoder.exitCode!==null||encoder.stdin.destroyed)throw new Error(stderr||'The video encoder stopped.');
        if(!encoder.stdin.write(frameData))await once(encoder.stdin,'drain');
      }
      await markFrame();
    }
    }
    job.renderSeconds=pauseControl.elapsed(started);job.remainingSeconds=0;pauseControl.dispose();
    job.status='encoding';job.message='Finalizing the MP4';encoder.stdin.end();await completion;
    if(cancelled)throw cancelledError();
    const result=JSON.parse(await command(ffprobe,['-v','error','-show_streams','-show_format','-of','json',output]));
    const video=result.streams.find(s=>s.codec_type==='video'),audio=result.streams.find(s=>s.codec_type==='audio');
    if(video?.width!==1920||video?.height!==1080||audio?.channels!==2||video.avg_frame_rate!==config.fps+'/1'||Number(video.nb_frames)!==total)throw new Error('The exported video failed validation.');
    return {width:video.width,height:video.height,channels:audio.channels,fps:config.fps,frames:total,duration:Number(result.format.duration),size:Number(result.format.size),codec:video.codec_name};
  }finally{
    pauseControl?.dispose();
    if(encoder&&encoder.exitCode===null)encoder.kill();
    await transport?.close().catch(()=>{});await browser?.close().catch(()=>{});delete job.cancel;
  }
}
