import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readdir,rm,symlink} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import os from 'node:os';
import path from 'node:path';
import {chromium} from 'playwright';
import {clearCache} from '../server/cache.js';
import {SavedSettings} from '../server/saved-settings.js';

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const jobId='22222222-2222-4222-8222-222222222222';

test('clearing all working data preserves saved presets and never follows directory links',async t=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'musicframe-cache-'));
 t.after(()=>rm(directory,{recursive:true,force:true}));
 const data=path.join(directory,'data'),outside=path.join(directory,'outside');
 await mkdir(outside);await writeFile(path.join(outside,'original.png'),'original image');
 for(const name of ['projects/reference','projects/production/images','uploads','exports','outputs','logs'])await mkdir(path.join(data,name),{recursive:true});
 for(const name of ['projects/reference/audio.mp3','projects/production/images/0001.png','uploads/unfinished.zip','exports/completed.mp4','exports/test.mov','exports/invalid.json','exports/job.recipe.json','exports/job.wav','outputs/legacy.mp4'])await writeFile(path.join(data,name),'test data');
 await symlink(outside,path.join(data,'projects','source-link'),process.platform==='win32'?'junction':'dir');
 const settings=JSON.stringify({version:1,presets:{led:{revision:7,config:{sensitivity:1.65}}},history:[{id:'accepted-settings'}]},null,2);
 await writeFile(path.join(data,'saved-settings.json'),settings);
 await writeFile(path.join(data,'reference-sources.json'),JSON.stringify({projectId:'reference'}));
 await writeFile(path.join(data,'logs','incident.log'),'diagnostic evidence');
 const projects=new Map([['reference',{}],['production',{}]]),jobs=new Map([['completed',{}]]);
 const result=await clearCache({data,projects,jobs});
 assert.ok(result.files>=10);assert.ok(result.bytes>0);
 assert.equal(projects.size,0);assert.equal(jobs.size,0);
 for(const name of ['projects','uploads','exports','outputs'])assert.deepEqual(await readdir(path.join(data,name)),[]);
 await assert.rejects(readFile(path.join(data,'reference-sources.json')),{code:'ENOENT'});
 assert.equal(await readFile(path.join(data,'saved-settings.json'),'utf8'),settings);
 assert.equal((await new SavedSettings(data).read()).presets.led.revision,7);
 assert.equal(await readFile(path.join(outside,'original.png'),'utf8'),'original image');
 assert.equal(await readFile(path.join(data,'logs','incident.log'),'utf8'),'diagnostic evidence');
 assert.deepEqual(await clearCache({data,projects,jobs}),{files:0,bytes:0});
});

test('LAN clear confirmation, selected files and stale browser sessions reset without changing settings',{timeout:45000},async t=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'musicframe-cache-ui-')),base='http://127.0.0.1:5194';
 const data=path.join(directory,'data');await mkdir(path.join(data,'exports'),{recursive:true});
 const settings='{"version":1,"presets":{},"history":[]}';await writeFile(path.join(data,'saved-settings.json'),settings);
 await writeFile(path.join(data,'exports',jobId+'.json'),JSON.stringify({id:jobId,kind:'production',status:'completed',createdAt:new Date().toISOString(),downloadUrl:'/api/exports/'+jobId+'/download',result:{duration:1,size:10}}));
 await writeFile(path.join(data,'exports',jobId+'.mp4'),'test video');
 const server=spawn(process.execPath,['server/index.js'],{cwd:process.cwd(),windowsHide:true,env:{...process.env,PORT:'5194',HOST:'127.0.0.1',DATA_DIR:data},stdio:['ignore','pipe','pipe']});
 let logs='';server.stdout.on('data',s=>logs+=s);server.stderr.on('data',s=>logs+=s);
 t.after(async()=>{if(server.exitCode===null){server.kill();await once(server,'exit');}await rm(directory,{recursive:true,force:true});});
 let ready=false;for(let i=0;i<80;i++){try{if((await fetch(base+'/api/service')).ok){ready=true;break;}}catch{}await wait(150);}assert.ok(ready,logs);
 const browser=await chromium.launch({headless:true,args:['--disable-gpu']});t.after(()=>browser.close());
 const page=await browser.newPage();await page.goto(base);await page.waitForFunction(()=>!document.querySelector('#result').hidden);
 await page.locator('#audio-input').setInputFiles({name:'selected.wav',mimeType:'audio/wav',buffer:Buffer.from('test')});
 await page.locator('#images-input').setInputFiles({name:'selected.zip',mimeType:'application/zip',buffer:Buffer.from('test')});
 await page.evaluate(()=>{localStorage.setItem('musicframe-render-project','old-project');localStorage.setItem('musicframe-render-preview-mode-v2','reactive');localStorage.setItem('unrelated-key','keep');});
 page.once('dialog',dialog=>dialog.dismiss());await page.locator('#clear-cache').click();
 assert.equal(await readFile(path.join(data,'exports',jobId+'.mp4'),'utf8'),'test video');
 const resetResponse=page.waitForResponse(r=>r.url().endsWith('/api/cache/clear')&&r.request().method()==='POST');
 page.once('dialog',dialog=>{assert.match(dialog.message(),/saved presets will be kept/i);return dialog.accept();});
 await page.locator('#clear-cache').click();assert.equal((await resetResponse).status(),200);
 await page.waitForFunction(()=>document.querySelector('#status').textContent==='Cache cleared');
 assert.deepEqual(await page.evaluate(()=>({audio:document.querySelector('#audio-input').files.length,images:document.querySelector('#images-input').files.length,audioLabel:document.querySelector('#audio-name').textContent,imagesLabel:document.querySelector('#images-name').textContent,renderDisabled:document.querySelector('#render').disabled,resultHidden:document.querySelector('#result').hidden,href:document.querySelector('#download').getAttribute('href'),job:localStorage.getItem('musicframe-render-render-job'),project:localStorage.getItem('musicframe-render-project'),preview:localStorage.getItem('musicframe-render-preview-mode-v2'),other:localStorage.getItem('unrelated-key')})),{audio:0,images:0,audioLabel:'',imagesLabel:'',renderDisabled:true,resultHidden:true,href:null,job:null,project:null,preview:'reactive',other:'keep'});
 assert.equal((await(await fetch(base+'/api/service')).json()).latestCompletedJob,null);
 assert.equal((await fetch(base+'/api/exports/'+jobId+'/download')).status,404);
 assert.equal(await readFile(path.join(data,'saved-settings.json'),'utf8'),settings);
 // A different LAN browser may still hold identifiers that have been deleted.
 await page.evaluate(id=>localStorage.setItem('musicframe-render-render-job',id),jobId);
 await page.reload();await page.waitForFunction(()=>document.querySelector('#status').textContent==='Add your audio and images to get started'&&!localStorage.getItem('musicframe-render-render-job'));
 assert.equal(await page.locator('#error').isHidden(),true);
});
