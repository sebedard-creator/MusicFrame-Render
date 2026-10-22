const cache=new WeakMap();
const balancedCache=new WeakMap();
export const adaptiveMode='adaptive-v1';
export const balancedMode='balanced-v1';

// A monotone shoulder retains differences between strong events. The legacy
// hard ceiling remains available for recipes that predate adaptive response.
export function reactionGain(value,gain=1,mode='legacy',ceiling=1){
 const drive=Math.max(0,value)*Math.max(0,gain);
 if(mode===balancedMode)return (Math.min(ceiling,drive)+ceiling*drive/(ceiling+drive))*.5;
 return mode===adaptiveMode?ceiling*drive/(ceiling+drive):Math.min(ceiling,drive);
}

// Causal local contrast, calculated once at the fixed analysis clock. A steady
// loud bed contributes only a little; positive changes and their short release
// drive the movement. Frequency measurements and onset timestamps stay intact.
export function responseAnalysis(analysis,mode='legacy'){
 if(mode===balancedMode){
  if(balancedCache.has(analysis))return balancedCache.get(analysis);
  const adaptive=responseAnalysis(analysis,adaptiveMode),count=analysis.frames.length;
  // Rotation integrates these envelopes directly rather than sampleResponse.
  const frames=new Proxy({length:count},{get:(target,key)=>{
   if(key==='length')return count;
   if(!/^\d+$/.test(String(key)))return target[key];
   const index=Number(key);if(index>=count)return undefined;
   const original=analysis.frames[index],adjusted=adaptive.frames[index];
   return original.map((value,band)=>(value+adjusted[band])*.5);
  }});
  const result={...analysis,frames};balancedCache.set(analysis,result);return result;
 }
 if(mode!==adaptiveMode)return analysis;
 if(cache.has(analysis))return cache.get(analysis);
 const count=analysis.frames.length,values=new Float32Array(count*4),baseline=new Float64Array(4),deviation=new Float64Array(4),attack=new Float64Array(4);
 const follow=1-Math.exp(-1/(analysis.fps*1.5)),release=Math.exp(-1/(analysis.fps*.12));
 for(let i=0;i<count;i++){
  const frame=analysis.frames[i];
  for(let band=0;band<4;band++){
   const level=Math.pow(Math.max(0,Math.min(1,frame[band])),4/3);
   if(i===0)baseline[band]=level;
   const difference=level-baseline[band];
   attack[band]=level===0?0:Math.max(0,difference,attack[band]*release);
   values[i*4+band]=level===0?0:level*.18+attack[band]/Math.max(.07,deviation[band]*3)*.82;
   baseline[band]+=difference*follow;deviation[band]+=(Math.abs(difference)-deviation[band])*follow;
  }
 }
 const frames=new Proxy({length:count},{get:(target,key)=>key==='length'?count:/^\d+$/.test(String(key))?Array.from(values.subarray(Number(key)*4,(Number(key)+1)*4)):target[key]});
 const result={...analysis,frames};cache.set(analysis,result);return result;
}

export function sampleResponse(analysis,time,sensitivity=1,mode='legacy'){
 // Mix the two finished responses so the new setting is an actual midpoint,
 // including their different level ceilings. Keep both historical modes intact.
 if(mode===balancedMode){
  const original=sampleResponse(analysis,time,sensitivity,'legacy');
  const adaptive=sampleResponse(analysis,time,sensitivity,adaptiveMode);
  return original.map((value,band)=>(value+adaptive[band])*.5);
 }
 const source=responseAnalysis(analysis,mode),frames=source.frames;
 if(!frames.length)return [0,0,0,0];
 const position=Math.max(0,time*source.fps),index=Math.min(frames.length-1,Math.floor(position)),fraction=position-Math.floor(position),a=frames[index],b=frames[Math.min(index+1,frames.length-1)];
 return a.map((value,band)=>reactionGain(value+(b[band]-value)*fraction,sensitivity,mode,mode===adaptiveMode?1:1.5));
}
