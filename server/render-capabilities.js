import {command,ffmpeg} from './media.js';
import {videoEncodingArgs} from './video-encoding.js';
let probe;
export function selectEncoder(){
  if(process.env.VISUALIZER_ENCODER==='cpu'||process.env.VISUALIZER_GPU==='off')return Promise.resolve('libx264');
  probe??=command(ffmpeg,['-v','error','-f','lavfi','-i','color=c=black:s=1920x1080:r=60','-frames:v','3','-an',...videoEncodingArgs(60,{encoder:'h264_nvenc',youtube:true}),'-f','null','-']).then(()=>'h264_nvenc',()=>'libx264');
  return probe;
}
