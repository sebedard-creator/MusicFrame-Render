import {readdir,rm,lstat,rmdir,mkdir} from 'node:fs/promises';
import path from 'node:path';
// Reset working data, including completed/legacy exports. Keep the approved
// preset settings and diagnostic logs (which may be held open on Windows).
export async function clearCache({data,projects,jobs}){
 const root=path.resolve(data);let files=0,bytes=0;
 if(root===path.parse(root).root)throw Error('Invalid data directory.');
 async function remove(target){
  const absolute=path.resolve(target);if(!absolute.startsWith(root+path.sep))throw Error('Invalid cache path.');
  let info;try{info=await lstat(absolute);}catch(error){if(error.code==='ENOENT')return;throw error;}
  if(info.isDirectory()&&!info.isSymbolicLink()){for(const child of await readdir(absolute))await remove(path.join(absolute,child));await rmdir(absolute);}
  else{await rm(absolute);bytes+=info.size;files++;}
 }
 const directories=['projects','uploads','exports','outputs'];
 try{
  for(const name of directories)await remove(path.join(root,name));
  for(const name of await readdir(root)){
   if(/^reference-sources\.json(?:\.[0-9a-f-]+\.tmp)?$/.test(name))await remove(path.join(root,name));
  }
 }finally{
  projects.clear();jobs.clear();
  // Keep working paths available for new requests without restarting Node.
  await Promise.all(directories.map(name=>mkdir(path.join(root,name),{recursive:true})));
 }
 return {files,bytes};
}
