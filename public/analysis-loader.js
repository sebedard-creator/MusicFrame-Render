import {applyNoiseFloor,applySmoothing,updatePeaks,aggregateBins,aggregatePeaks,peakToUint8} from './vendor/fft-visualizer/processing.js';
import {sampleStereoTrack} from './stereo-spectrum.js';

const rows=(values,width)=>new Proxy({length:values.length/width},{get:(target,key)=>key==='length'?target.length:/^\d+$/.test(String(key))?Array.from(values.subarray(Number(key)*width,(Number(key)+1)*width),v=>v/1000):target[key]});
async function bytes(url,start,end){const response=await fetch(url,{headers:start===undefined?{}:{Range:`bytes=${start}-${end}`}});if(!response.ok)throw Error('Analyse audio inaccessible.');if(start!==undefined&&response.status!==206)throw Error('Le serveur ne prend pas en charge la lecture partielle.');return response.arrayBuffer();}

// Exact causal processing, including peak state. Only the current block of raw
// magnitudes and four processed frames are retained, regardless of song length.
export class StreamingStereoSampler{
 constructor(source,url){this.source=source;this.url=url;this.last=-1;this.block=-1;this.output=new Map();this.frames=new Proxy({length:source.count},{get:(t,k)=>k==='length'?t.length:this.output.get(Number(k))});}
 async ensure(time,config){
  const key=[config.glowBands,config.glowGain,config.glowFloor,config.glowSmoothing,config.glowPeakDrop].join(':');
  const index=Math.max(0,Math.min(this.source.count-1,Math.floor(time*this.source.fps))),next=Math.min(index+1,this.source.count-1);
  if(key!==this.key||index<this.last-2){this.key=key;this.last=-1;this.output.clear();this.smoothed=[new Float32Array(160),new Float32Array(160)];this.peaks=[new Float32Array(160),new Float32Array(160)];}
  for(let frame=this.last+1;frame<=next;frame++){
   const block=Math.floor(frame/1800);
   if(block!==this.block){this.block=block;this.raw=new Uint8Array(await bytes(this.url,block*1800*320,Math.min(this.source.count,(block+1)*1800)*320-1));}
   const start=(frame%1800)*320;
   const output=[0,1].map(ch=>{
    const data=Uint8Array.from(this.raw.subarray(start+ch*160,start+(ch+1)*160),v=>Math.min(255,Math.round(v*(config.glowGain??1))));
    applyNoiseFloor(data,config.glowFloor??65);applySmoothing(data,this.smoothed[ch],config.glowSmoothing??.65);updatePeaks(this.peaks[ch],data,config.glowPeakDrop??.99);
    return {data:aggregateBins(data,config.glowBands??80),peaks:peakToUint8(aggregatePeaks(this.peaks[ch],config.glowBands??80),config.glowBands??80)};
   });
   this.output.set(frame,output);if(this.output.size>4)this.output.delete(this.output.keys().next().value);this.last=frame;
  }
 }
 sample(time,config){return sampleStereoTrack(this.frames,this.source.fps,time,config.glowBands??80);}
}

export async function loadAnalysis(url){
 const response=await fetch(url);if(!response.ok)throw Error('Analyse introuvable.');const analysis=await response.json();
 if(analysis.version!==2)return analysis;
 const base=new URL(url,location.href),[envelope,spectrum]=await Promise.all([bytes(new URL(analysis.envelopesFile,base)),bytes(new URL(analysis.spectrum.file,base))]);
 analysis.frames=rows(new Uint16Array(envelope),4);analysis.spectrum.frames=rows(new Uint16Array(spectrum),64);
 analysis.analyzer.sampler=new StreamingStereoSampler(analysis.analyzer,new URL(analysis.analyzer.file,base));
 analysis.ensure=(time,config)=>analysis.analyzer.sampler.ensure(time,config);
 return analysis;
}
