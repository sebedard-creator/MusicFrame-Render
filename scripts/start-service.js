import {spawn,execFile} from 'node:child_process';
import {openSync,closeSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const backgroundChild=process.argv[2]==='--background-child';
if(backgroundChild){
  const {readFile}=await import('node:fs/promises');
  const request=JSON.parse(await readFile(process.argv[3],'utf8'));
  for(const [key,value]of Object.entries(request.environment))process.env[key]=value;
}
const port=Number(process.env.PORT||5180);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
if(!Number.isInteger(port)||port<1||port>65535)throw Error('Port invalide.');
const base='http://127.0.0.1:'+port;
async function status(){
  try{
    const response=await fetch(base+'/api/status',{signal:AbortSignal.timeout(1500)});
    if(response.ok){const result=await response.json();if(result.name==='MusicFrame Render')return result;}
  }catch{}
  return null;
}

async function main(){
  if(await status()){console.log('MusicFrame Render est déjà démarré : '+base);return;}
  const logs=path.join(path.resolve(process.env.DATA_DIR||path.join(root,'data')),'logs');
  await mkdir(logs,{recursive:true});
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  if(process.platform==='win32'&&!backgroundChild){
    // detached:true alone still inherits a Windows Job from the launching terminal.
    // WMI creates an independent process outside that Job, without changing policy.
    const environment={};
    for(const [key,value]of Object.entries(process.env)){
      if(['PORT','HOST','DATA_DIR','FFMPEG_PATH','FFPROBE_PATH','VISUALIZER_GPU','VISUALIZER_ENCODER','VISUALIZER_PACKED_ANALYSIS','PLAYWRIGHT_BROWSERS_PATH','PATH','TEMP','TMP'].includes(key.toUpperCase()))environment[key]=value;
    }
    const requestFile=path.join(logs,'launch-'+stamp+'.json');
    await writeFile(requestFile,JSON.stringify({environment},null,2),{flag:'wx'});
    const quote=value=>"'"+value.replaceAll("'","''")+"'";
    const commandLine=`"${process.execPath}" "${fileURLToPath(import.meta.url)}" --background-child "${requestFile}"`;
    const script=`$ErrorActionPreference='Stop'; $startup=New-CimInstance -ClassName Win32_ProcessStartup -ClientOnly -Property @{ShowWindow=[UInt16]0}; $result=Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{CommandLine=${quote(commandLine)}; CurrentDirectory=${quote(root)}; ProcessStartupInformation=$startup}; if($result.ReturnValue -ne 0){throw ('Windows launch failed: '+$result.ReturnValue)}; $result.ProcessId`;
    await promisify(execFile)('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,timeout:20000});
    for(let attempt=0;attempt<60;attempt++){
      const running=await status();
      if(running){printReady(running,logs);return;}
      await wait(300);
    }
    throw Error('Le serveur ne répond pas encore. Voir : '+logs);
  }
  const stdout=path.join(logs,'server-'+stamp+'.stdout.log'),stderr=path.join(logs,'server-'+stamp+'.stderr.log');
  const output=openSync(stdout,'wx');let errors,child,spawnError;
  try{
    errors=openSync(stderr,'wx');
    const diagnosticFlags=['--report-on-fatalerror','--report-uncaught-exception','--report-directory='+logs];
    if(process.allowedNodeEnvironmentFlags.has('--report-exclude-env'))diagnosticFlags.push('--report-exclude-env');
    child=spawn(process.execPath,[...diagnosticFlags,path.join(root,'server','index.js')],{
      cwd:root,detached:true,windowsHide:true,stdio:['ignore',output,errors],env:process.env,
    });
    child.on('error',error=>{spawnError=error;});
    child.unref();
  }finally{closeSync(output);if(errors!==undefined)closeSync(errors);}
  if(child.pid)await writeFile(path.join(logs,'server.pid'),String(child.pid));
  for(let attempt=0;attempt<60;attempt++){
    if(spawnError)throw spawnError;
    const running=await status();
    if(running){
      printReady(running,logs);
      return;
    }
    if(child.exitCode!==null||child.signalCode!==null)throw Error('Le serveur s’est arrêté. Voir : '+stderr);
    await wait(300);
  }
  throw Error('Le serveur ne répond pas encore. Voir : '+stderr);
}
function printReady(running,logs){
  console.log('MusicFrame Render : '+base);
  for(const address of running.lan||[])console.log('LAN : '+address.url);
  console.log('Journaux : '+logs);
  console.log('Le serveur reste actif après la fermeture de cette fenêtre.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
