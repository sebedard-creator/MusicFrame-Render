import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {WebSocketServer} from 'ws';

// One persistent local connection, exact RGBA bytes, and one acknowledged frame
// in flight. Never compress pixels or queue a whole song in memory.
export async function frameSocket(stdin,origin,width=1920,height=1080,{onFrame,channels=4}={}){
 const route='/'+randomUUID(),expected=width*height*channels;
 const server=createServer((req,res)=>res.writeHead(404).end());
 const sockets=new WebSocketServer({noServer:true,perMessageDeflate:false,maxPayload:expected});
 let failure,client,received=0,busy=false;
 server.on('upgrade',(req,socket,head)=>{
  if(req.url!==route||req.headers.origin!==origin||client){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}
  sockets.handleUpgrade(req,socket,head,ws=>{
   client=ws;
   ws.on('error',error=>{failure=error;});
   ws.on('message',(frame,binary)=>{
    if(!binary||frame.length!==expected||busy){failure=Error('Frame incorrect ou reçu hors ordre.');ws.close(1008);return;}
    busy=true;
    void(async()=>{
     if(stdin.destroyed)throw Error('Encodeur arrêté.');
     if(!stdin.write(frame))await once(stdin,'drain');
     await onFrame?.();ws.send(String(++received));
    })().catch(error=>{failure=error;ws.close(1011);}).finally(()=>{busy=false;});
   });
  });
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 return {url:`ws://127.0.0.1:${server.address().port}${route}`,get error(){return failure;},async close(){client?.terminate();sockets.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}};
}
