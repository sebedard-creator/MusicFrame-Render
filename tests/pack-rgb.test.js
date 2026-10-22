import test from 'node:test';
import assert from 'node:assert/strict';
import {randomFillSync} from 'node:crypto';
import {packRGB} from '../public/pack-rgb.js';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {command,ffmpeg} from '../server/media.js';
test('RGB transport retains every color byte while omitting unused alpha',()=>{
 const input=randomFillSync(new Uint8Array(1920*16*4)),output=packRGB(input,new Uint8Array(1920*16*3));
 for(let i=0;i<input.length/4;i++)for(let c=0;c<3;c++)assert.equal(output[i*3+c],input[i*4+c]);
});
test('RGB and RGBA transports produce identical BT709 YUV samples before encoding',async t=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'visualizer-rgb-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const rgba=randomFillSync(new Uint8Array(640*360*4));for(let i=3;i<rgba.length;i+=4)rgba[i]=255;
 const rgb=packRGB(rgba,new Uint8Array(640*360*3));await writeFile(path.join(dir,'rgba.raw'),rgba);await writeFile(path.join(dir,'rgb24.raw'),rgb);
 const convert=format=>command(ffmpeg,['-v','error','-f','rawvideo','-pixel_format',format,'-video_size','640x360','-i',path.join(dir,format+'.raw'),'-vf','vflip,scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p','-frames:v','1','-f','rawvideo','pipe:1']);
 assert.deepEqual(await convert('rgb24'),await convert('rgba'));
});
