import test from 'node:test';
import assert from 'node:assert/strict';
import {PassThrough} from 'node:stream';
import {once} from 'node:events';
import WebSocket from 'ws';
import {frameSocket} from '../server/frame-socket.js';
test('persistent pixel socket preserves bytes and order and rejects an unrelated origin',async()=>{
 const output=new PassThrough(),frames=[];output.on('data',b=>frames.push(b));let count=0;
 const transport=await frameSocket(output,'http://127.0.0.1:5180',2,2,{onFrame:()=>count++});
 try{
  const refused=new WebSocket(transport.url,{origin:'http://other.example'});assert.match((await once(refused,'error'))[0].message,/403/);
  const socket=new WebSocket(transport.url,{origin:'http://127.0.0.1:5180'});await once(socket,'open');
  const pixels=Buffer.from(Array.from({length:16},(_,i)=>i*13));
  for(let i=1;i<=3;i++){const ack=once(socket,'message');socket.send(pixels);assert.equal(String((await ack)[0]),String(i));}
  assert.equal(count,3);assert.deepEqual(Buffer.concat(frames),Buffer.concat([pixels,pixels,pixels]));assert.equal(transport.error,undefined);socket.terminate();
 }finally{await transport.close();}
});
