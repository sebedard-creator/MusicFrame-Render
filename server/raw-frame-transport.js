import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {inflate} from 'node:zlib';
import {promisify} from 'node:util';
const decompress=promisify(inflate);

// Loopback-only, one frame in flight, stream backpressure. Avoid PNG compression,
// base64 and JSON copies while retaining every pixel before the final encode.
export async function rawFrameTransport(stdin,origin,width=1920,height=1080,{onFrame,compression=false}={}){
  const route='/'+randomUUID()+(compression?'/deflate':''),expected=width*height*4;let failure,busy=false;
  const server=createServer((req,res)=>{
    if(req.url!==route||req.headers.origin!==origin){res.writeHead(403).end();return;}
    res.setHeader('Access-Control-Allow-Origin',origin);
    res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers','Content-Type');
    res.setHeader('Access-Control-Max-Age','3600');
    if(req.method==='OPTIONS'){res.writeHead(204).end();return;}
    const length=Number(req.headers['content-length']);
    if(req.method!=='POST'||busy||!length||length>expected+65536||(!compression&&length!==expected)){res.writeHead(400).end();return;}
    busy=true;
    void(async()=>{
      let bytes=0;const chunks=[];
      for await(const chunk of req){
        bytes+=chunk.length;if(bytes>expected+65536||stdin.destroyed)throw Error('Transmission du frame interrompue.');
        chunks.push(chunk);
      }
      let frame=Buffer.concat(chunks,bytes);
      if(compression)frame=await decompress(frame,{maxOutputLength:expected});
      if(frame.length!==expected)throw Error('Frame incomplet.');
      // One bounded frame write avoids hundreds of tiny Windows pipe flushes.
      if(!stdin.write(frame))await once(stdin,'drain');
      await onFrame?.();
      res.writeHead(204).end();
    })().catch(error=>{failure=error;if(!res.headersSent)res.writeHead(500);res.end();}).finally(()=>{busy=false;});
  });
  server.requestTimeout=120000;server.headersTimeout=30000;
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  return {url:`http://127.0.0.1:${server.address().port}${route}`,get error(){return failure;},async close(){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}};
}
