import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {PassThrough} from 'node:stream';
import WebSocket from 'ws';
import {frameSocket} from '../server/frame-socket.js';
import {rawFrameTransport} from '../server/raw-frame-transport.js';
import {activeRenderStates,createRenderPause} from '../server/render-pause.js';

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

test('pause preserves progress, excludes paused time, and supports repeated controls',async()=>{
  let now=1000;
  const job={status:'rendering',frames:42,progress:30},control=createRenderPause(job,()=>now);
  try{
    assert.ok(activeRenderStates.includes('paused'));
    now=3000;assert.equal(job.pause(),true);assert.equal(job.pause(),true);
    let advanced=false;const pending=control.wait().then(()=>{advanced=true;});
    await wait(15);assert.equal(advanced,false);assert.equal(job.frames,42);assert.equal(job.status,'paused');
    now=3_603_000;assert.equal(control.elapsed(1000),2);
    assert.equal(job.resume(),true);assert.equal(job.resume(),false);await pending;
    now+=1000;assert.equal(control.elapsed(1000),3);assert.equal(job.status,'rendering');
    assert.equal(job.pause(),true);control.dispose();assert.equal(job.pause,undefined);assert.equal(job.resume,undefined);
  }finally{control.dispose();}
});

test('cleanup releases a paused frame so stopping cannot deadlock',async()=>{
  const job={status:'rendering'},control=createRenderPause(job);
  job.pause();const frame=control.wait();job.cancelRequested=true;control.dispose();
  await frame;assert.equal(job.cancelRequested,true);assert.equal(job.resume,undefined);
  const finishing={status:'encoding'},other=createRenderPause(finishing);
  assert.equal(finishing.pause(),false);other.dispose();
});

for(const socket of [true,false])test(`${socket?'WebSocket':'HTTP'} pause holds acknowledgement and resumes exact frames in order`,{timeout:5000},async()=>{
  const job={status:'rendering',frames:0},control=createRenderPause(job),output=new PassThrough(),received=[];
  output.on('data',frame=>received.push(frame));
  let reached;const boundary=new Promise(resolve=>{reached=resolve;});
  const options={onFrame:async()=>{job.frames++;if(job.frames===2){job.pause();reached();}await control.wait();}};
  const transport=await (socket?frameSocket:rawFrameTransport)(output,'http://127.0.0.1:5180',2,2,options);
  let client;
  try{
    if(socket){client=new WebSocket(transport.url,{origin:'http://127.0.0.1:5180'});await once(client,'open');}
    const send=async frame=>{
      if(socket){const ack=once(client,'message');client.send(frame);return String((await ack)[0]);}
      return (await fetch(transport.url,{method:'POST',headers:{Origin:'http://127.0.0.1:5180'},body:frame})).status;
    };
    const frames=[1,2,3].map(n=>Buffer.alloc(16,n));
    await send(frames[0]);let acknowledged=false;
    const paused=send(frames[1]).then(result=>{acknowledged=true;return result;});
    await boundary;await wait(30);assert.equal(acknowledged,false);assert.equal(job.frames,2);assert.equal(received.length,2);
    job.resume();assert.equal(await paused,socket?'2':204);await send(frames[2]);
    assert.equal(job.frames,3);assert.deepEqual(Buffer.concat(received),Buffer.concat(frames));assert.equal(transport.error,undefined);
  }finally{control.dispose();client?.terminate();await transport.close();output.end();}
});
