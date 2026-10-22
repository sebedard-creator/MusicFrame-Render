import { portalPulse } from './portal-pulse.js';

// Exact inverse-transform bounds for a rotating 16:9 image around any pivot.
export function orbitCover(angle,centerX=.5,centerY=.5){
  const c=Math.cos(angle),s=Math.sin(angle);let scale=1;
  for(const x of [0,1])for(const y of [0,1]){
    const dx=(x-centerX)*1920,dy=(y-centerY)*1080;
    const qx=c*dx+s*dy,qy=-s*dx+c*dy;
    scale=Math.max(scale,qx/(1920*(qx>=0?1-centerX:-centerX)),qy/(1080*(qy>=0?1-centerY:-centerY)));
  }
  return scale;
}

export function orbitPose(config,time,audioTravel,track){
  const strength=config.intensity??1;
  const phase=audioTravel*(config.sensitivity??1)*(config.speed??1)*.75;
  const amplitude=(config.orbitAmplitude??7)*Math.PI/180;
  const pulse=portalPulse(track,time,{intensity:strength,portalReaction:config.orbitReaction??1,portalReturn:config.orbitReturn??.38,portalGain:1.6,portalThreshold:.35,sensitivity:config.sensitivity,audioResponse:config.audioResponse});
  const base=amplitude*(config.orbitMode===1?phase*.4:Math.sin(phase))*strength;
  const angle=base+pulse.impact*(config.orbitKick??2.5)*Math.PI/180*(pulse.pattern%2?-1:1);
  const centerX=config.orbitCenterX??.5,centerY=config.orbitCenterY??.5;
  return {angle,cover:orbitCover(angle,centerX,centerY),centerX,centerY,grain:(config.orbitGrain??.3)*strength};
}
