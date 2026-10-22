import {writeFile,rename,unlink} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';

export async function writeAtomicJson(file,value){
  const temporary=`${file}.${randomUUID()}.tmp`;
  try{
    await writeFile(temporary,JSON.stringify(value,null,2),{flag:'wx'});
    for(let attempt=0;;attempt++){
      try{await rename(temporary,file);return;}
      catch(error){if(!['EPERM','EACCES','EBUSY'].includes(error.code)||attempt>=7)throw error;await new Promise(resolve=>setTimeout(resolve,50*(attempt+1)));}
    }
  }finally{await unlink(temporary).catch(()=>{});}
}
