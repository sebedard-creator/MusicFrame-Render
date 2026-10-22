import { portalPulse } from './portal-pulse.js';

export function dataGrainLayout(columns){
  const rows=Math.max(2,Math.round(columns*9/16)),count=columns*rows;
  const homes=new Float32Array(count*2),seeds=new Float32Array(count);
  for(let i=0;i<count;i++){
    let h=i+1;h=Math.imul(h^h>>>16,0x7feb352d);h=Math.imul(h^h>>>15,0x846ca68b);
    const seed=((h^h>>>16)>>>0)/4294967296;
    homes[i*2]=((i%columns)+.2+seed*.6)/columns;
    homes[i*2+1]=(Math.floor(i/columns)+.2+((seed*137.3)%1)*.6)/rows;
    seeds[i]=seed;
  }
  return {rows,count,homes,seeds};
}

export function dataGrainDrive(config,time,bands,track){
  const strength=config.intensity??1,reaction=strength*(config.dataReaction??1);
  const pulse=portalPulse(track,time,{intensity:strength,portalReaction:config.dataReaction??1,portalReturn:config.dataReturn??.22,portalGain:1.6,portalThreshold:.35,sensitivity:config.sensitivity,audioResponse:config.audioResponse});
  return {attack:pulse.impact,pattern:pulse.pattern,force:Math.min(1.5,pulse.impact*.9+(bands[1]*.32+bands[2]*.18)*reaction),phase:time*(config.speed??1),strength};
}
