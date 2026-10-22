import { presets,presetNames } from '../public/presets.js';
import { defaultSequenceTiming } from '../public/effect-sequence.js';
import { validateConfig } from './config.js';
import { randomInt } from 'node:crypto';

export function buildProductionSequence(project,saved={}) {
  // Freeze a fresh shuffle in the recipe so GPU/CPU retries use the same photos.
  const imageOrder=(project.images||[]).map((_,index)=>index);
  for(let i=imageOrder.length-1;i>0;i--){
    const j=randomInt(i+1);
    [imageOrder[i],imageOrder[j]]=[imageOrder[j],imageOrder[i]];
  }
  const segmentSeconds=defaultSequenceTiming.holdSeconds+defaultSequenceTiming.transitionSeconds;
  const segments=Object.keys(presets).filter(key=>key!=='stereoGlow').map(key=>({key,name:presetNames[key],revision:saved[key]?.revision??0,
    config:validateConfig({...presets[key],...saved[key]?.config,preset:key,imageSeconds:segmentSeconds,fps:60,audioResponse:'balanced-v1'})}));
  return {repeat:true,labels:false,imageOrder,durationSeconds:project.audio.duration,segmentSeconds,transitionSeconds:defaultSequenceTiming.transitionSeconds,segments,
    spectrumConfig:validateConfig({...presets.stereoGlow,...saved.stereoGlow?.config,preset:'stereoGlow',fps:60})};
}
