import { portalPulse } from './portal-pulse.js';

// Reuse the tested causal attack detector, without the rejected portal geometry.
export function advectionDrive(config,time,bands,track){
  const reaction=(config.intensity??1)*(config.advReaction??1);
  const pulse=portalPulse(track,time,{intensity:config.intensity,portalReaction:config.advReaction,portalReturn:config.advReturn??.16,portalGain:config.advGain??1.6,portalThreshold:.35,sensitivity:config.sensitivity,audioResponse:config.audioResponse});
  return {attack:pulse.impact,pattern:pulse.pattern,force:Math.min(1.8,pulse.impact*1.2+(bands[1]*.10+bands[2]*.08)*reaction),phase:time*(config.speed??1),strength:config.intensity??1};
}
