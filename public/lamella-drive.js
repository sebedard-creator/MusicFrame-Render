import { portalPulse } from './portal-pulse.js';

// Deterministic motion sampled at the audio clock, shared by preview and export.
export function lamellaDrive(config,time,bands,track){
  const strength=config.intensity??1,reaction=strength*(config.lamReaction??1);
  const pulse=portalPulse(track,time,{intensity:strength,portalReaction:config.lamReaction??1,portalReturn:config.lamReturn??.24,portalGain:config.lamGain??1.5,portalThreshold:.35,sensitivity:config.sensitivity,audioResponse:config.audioResponse});
  return {attack:pulse.impact,pattern:pulse.pattern,force:Math.min(1.5,pulse.impact*.85+(bands[1]*.32+bands[2]*.15)*reaction),phase:time*(config.speed??1),strength};
}
