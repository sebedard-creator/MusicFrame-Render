import test from 'node:test';
import assert from 'node:assert/strict';
import {PassThrough} from 'node:stream';
import {deflateSync} from 'node:zlib';
import {rawFrameTransport} from '../server/raw-frame-transport.js';

test('loopback frame transport is lossless, ordered and validates its origin and dimensions',async()=>{
 const stream=new PassThrough(),chunks=[];stream.on('data',chunk=>chunks.push(chunk));let count=0;
 const transport=await rawFrameTransport(stream,'http://127.0.0.1:5180',2,2,{compression:true,onFrame:()=>count++});
 try{
  const pixels=Buffer.from(Array.from({length:16},(_,i)=>i*13));
  assert.equal((await fetch(transport.url,{method:'POST',headers:{Origin:'http://untrusted.example'},body:deflateSync(pixels)})).status,403);
  for(let i=0;i<2;i++){const response=await fetch(transport.url,{method:'POST',headers:{Origin:'http://127.0.0.1:5180'},body:deflateSync(pixels)});assert.equal(response.status,204);}
  assert.equal(count,2);assert.deepEqual(Buffer.concat(chunks),Buffer.concat([pixels,pixels]));assert.equal(transport.error,undefined);
 }finally{await transport.close();stream.end();}
});
