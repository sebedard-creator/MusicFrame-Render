import {reactionGain} from './audio-response.js';
// Short causal attack envelope: no motion between attacks, no rendered history.
export function portalPulse(track,time,config){
  const events=track?.events||[],release=config.portalReturn??.14;
  const gain=(config.sensitivity??1)*(config.portalGain??1.6),threshold=config.portalThreshold??.35;
  let low=0,high=events.length;
  // start + frame/fps and absoluteFrame/fps can differ by one floating-point ULP.
  // Admit that arithmetic rounding, without advancing by a visible audio frame.
  const epsilon=1e-9;
  while(low<high){const mid=(low+high)>>>1;if(events[mid].time<=time+epsilon)low=mid+1;else high=mid;}
  let impact=0,pattern=0;
  for(let i=low-1;i>=0;i--){
    const event=events[i],age=Math.max(0,time-event.time);if(age+epsilon>=release)break;
    const strength=event.strength*gain;if(strength<threshold)continue;
    const value=reactionGain(event.strength,gain,config.audioResponse)*Math.pow(Math.max(0,1-age/release),1.5);
    if(value>impact){impact=value;pattern=event.pattern;}
  }
  return {impact:impact*(config.intensity??1)*(config.portalReaction??1),pattern};
}

// Rectangular rings partition the photo exactly; the last piece is the center.
export function portalLayout(count){
  if(!Number.isInteger(count)||count<4||count>40)throw new Error('Nombre de cadres invalide.');
  const centers=[],sizes=[],levels=[];
  const add=(x,y,w,h,level)=>{centers.push(x,y);sizes.push(w,h);levels.push(level);};
  for(let ring=0;ring<count;ring++){
    const outer=.5*(1-ring/count),inner=.5*(1-(ring+1)/count),level=ring/(count-1);
    if(ring===count-1){add(0,0,outer*2,outer*2,level);continue;}
    const thickness=outer-inner,offset=(outer+inner)/2;
    add(0,offset,outer*2,thickness,level);add(0,-offset,outer*2,thickness,level);
    add(-offset,0,thickness,inner*2,level);add(offset,0,thickness,inner*2,level);
  }
  return {count:levels.length,centers:new Float32Array(centers),sizes:new Float32Array(sizes),levels:new Float32Array(levels)};
}
