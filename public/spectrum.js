import {reactionGain,adaptiveMode,balancedMode} from './audio-response.js';
// Logarithmic bands are relative visual envelopes, not calibrated dB readings.
export const spectrumBands = 64;
export const spectrumMinHz = 40;
export const spectrumMaxHz = 10000;
export function spectralRanges(sampleRate=24000,size=2048){
  return Array.from({length:spectrumBands},(_,i)=>{
    const lo=spectrumMinHz*(spectrumMaxHz/spectrumMinHz)**(i/spectrumBands);
    const hi=spectrumMinHz*(spectrumMaxHz/spectrumMinHz)**((i+1)/spectrumBands);
    return [Math.max(1,Math.floor(lo*size/sampleRate)),Math.min(size/2,Math.max(Math.floor(lo*size/sampleRate)+1,Math.ceil(hi*size/sampleRate)))];
  });
}
export function sampleSpectrum(analysis,time,sensitivity=1,mode='legacy'){
  if(mode===balancedMode){
    const original=sampleSpectrum(analysis,time,sensitivity,'legacy'),adaptive=sampleSpectrum(analysis,time,sensitivity,adaptiveMode);
    return original.map((value,band)=>(value+adaptive[band])*.5);
  }
  const frames=analysis?.spectrum?.frames;
  const source=frames?.length?frames:analysis?.frames;
  if(!source?.length)return new Float32Array(spectrumBands);
  const position=Math.max(0,Math.min(source.length-1,time*(analysis.fps||60)));
  const index=Math.floor(position),fraction=position-index,a=source[index],b=source[Math.min(index+1,source.length-1)];
  return Float32Array.from({length:spectrumBands},(_,i)=>{
    // Old sessions retain their original four-envelope analysis until reanalyzed.
    const band=frames?.length?i:i<23?1:i<48?2:3;
    return reactionGain(a[band]*(1-fraction)+b[band]*fraction,sensitivity,mode,mode===adaptiveMode?1:1.5);
  });
}
