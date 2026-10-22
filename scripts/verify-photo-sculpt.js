import { readFile,writeFile,mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { renderVideo } from '../server/render.js';
import { validateConfig } from '../server/config.js';
import { legacyPresets } from '../public/presets.js';
import { chromium } from 'playwright';
import sharp from 'sharp';

const baseUrl='http://127.0.0.1:5180';
const reference=await(await fetch(baseUrl+'/api/reference')).json();
const project=reference.project;
const stored=JSON.parse(await readFile(path.join('data/projects',project.id,'project.json'),'utf8'));
const before=createHash('sha256').update(await readFile('data/saved-settings.json')).digest('hex');
const config=validateConfig({...project.config,...legacyPresets.sculpt,preset:'sculpt',fps:60});
const directory=path.resolve('test-output/photo-sculpt');await mkdir(directory,{recursive:true});
const job={};const result=await renderVideo({job,project:{...project,audioPath:stored.audioPath,audio:{...project.audio,duration:3}},config,output:path.join(directory,'test-1080p60.mp4'),baseUrl,startTime:7,hardware:true,captureFrame:async(frame,data)=>{if([0,90,179].includes(frame))await writeFile(path.join(directory,`frame-${frame}.png`),data);}});
// Exercise the actual render entry point at nonconsecutive times and detect GL errors.
const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--enable-gpu']});
const errors=[];
try{
 const page=await browser.newPage();page.on('pageerror',error=>errors.push(error.message));page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
 await page.goto(baseUrl+'/render.html');await page.waitForFunction(()=>typeof window.initializeRender==='function');
 await page.evaluate(async({project,config})=>window.initializeRender(project,config),{project,config});
 const first=await page.evaluate(()=>window.renderFrame(8.5));
 await page.evaluate(()=>window.renderFrame(27));
 const replay=await page.evaluate(()=>window.renderFrame(8.5));
 if(first!==replay)throw new Error('Le relief dépend de l’ordre de lecture.');
 const active=await sharp(Buffer.from(first,'base64')).removeAlpha().raw().toBuffer();
 const staticFrame=await page.evaluate(async config=>{window.engine.setConfig({...config,intensity:0});return window.renderFrame(8.5);},config);
 const quiet=await sharp(Buffer.from(staticFrame,'base64')).removeAlpha().raw().toBuffer();
 let difference=0;for(let i=0;i<active.length;i++)difference+=Math.abs(active[i]-quiet[i]);difference/=active.length;
 if(difference<1)throw new Error('La réaction audio est trop faible ou absente.');
 const overlay=JSON.parse(await readFile('data/saved-settings.json','utf8')).presets.stereoGlow.config;
 await page.evaluate(async overlay=>{window.engine.setSpectrumOverlay(overlay);return window.renderFrame(8.5);},overlay);
 if(errors.length)throw new Error(errors.join('\n'));
 if(before!==createHash('sha256').update(await readFile('data/saved-settings.json')).digest('hex'))throw new Error('Sauvegardes modifiées.');
 const report={result,renderer:job.renderer,seekIdentical:true,audioPixelDifference:difference,errors,savedSettingsHash:before};
 await writeFile(path.join(directory,'verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
