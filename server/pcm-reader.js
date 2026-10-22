import {open} from 'node:fs/promises';

// Fixed-size window over decoded stereo float PCM. No whole-song allocation.
export async function pcmReader(file){
 const handle=await open(file,'r'),{size}=await handle.stat();let start=-1,data=new Float32Array();
 return {samples:size/4,async window(first,count){
  const lo=Math.max(0,first),hi=Math.min(size/4,first+count);
  if(hi>lo&&(lo<start||hi>start+data.length)){
   const position=Math.floor(lo/262144)*262144,buffer=Buffer.alloc(Math.min(size-position*4,1048576+count*4));
   const {bytesRead}=await handle.read(buffer,0,buffer.length,position*4);start=position;data=new Float32Array(buffer.buffer,buffer.byteOffset,bytesRead/4);
  }
  return index=>index<0||index>=size/4?0:data[index-start]||0;
 },async close(){await handle.close();}};
}
