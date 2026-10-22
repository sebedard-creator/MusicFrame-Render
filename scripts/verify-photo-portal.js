import { readFile,writeFile,mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { renderVideo } from '../server/render.js';
import { validateConfig } from '../server/config.js';
import { legacyPresets as presets } from '../public/presets.js';
import { buildImpactTrack } from '../public/audio-impacts.js';
import { chromium } from 'playwright';
import sharp from 'sharp';

const baseUrl='http://127.0.0.1:5180',reference=await(await fetch(baseUrl+'/api/reference')).json(),project=reference.project;
const stored=JSON.parse(await readFile(path.join('data/projects',project.id,'project.json'),'utf8'));
const before=createHash('sha256').update(await readFile('data/saved-settings.json')).digest('hex');
const config=validateConfig({...project.config,...presets.portal,preset:'portal',fps:60});
const directory=path.resolve('test-output/photo-portal');await mkdir(directory,{recursive:true});
const analysis=await(await fetch(baseUrl+project.analysisUrl)).json(),events=buildImpactTrack(analysis).events;
const beat=events.filter(event=>event.time>=7&&event.time<10).sort((a,b)=>b.strength-a.strength)[0];
if(!beat)throw new Error('Aucune attaque mesurée dans le passage de test.');
const beatFrame=Math.round((beat.time-7)*60),job={};
const result=await renderVideo({job,project:{...project,audioPath:stored.audioPath,audio:{...project.audio,duration:3}},config,output:path.join(directory,'test-1080p60.mp4'),baseUrl,startTime:7,hardware:true,captureFrame:async(frame,data)=>{if([0,90,179,beatFrame].includes(frame))await writeFile(path.join(directory,frame===beatFrame?'real-attack.png':`frame-${frame}.png`),data);}});
const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--enable-gpu']}),errors=[];
try{
 const page=await browser.newPage();page.on('pageerror',error=>errors.push(error.message));page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
 await page.goto(baseUrl+'/render.html');await page.waitForFunction(()=>typeof window.initializeRender==='function');
 await page.evaluate(async({project,config})=>window.initializeRender(project,config),{project,config});
 const first=await page.evaluate(time=>window.renderFrame(time),beat.time);await page.evaluate(()=>window.renderFrame(27));
 const replay=await page.evaluate(time=>window.renderFrame(time),beat.time);if(first!==replay)throw new Error('Les cadres dépendent de l’ordre de lecture.');
 // Isolated synthetic onset proves frame-accurate trigger/return, rather than
 // merely comparing two unrelated animated screenshots.
 await page.evaluate(()=>{window.engine.impacts={events:[{time:8.5,strength:1,pattern:3}]};});
 const quiet=await page.evaluate(()=>window.renderFrame(8.5-1/60));
 const peak=await page.evaluate(()=>window.renderFrame(8.5));
 await writeFile(path.join(directory,'isolated-attack.png'),Buffer.from(peak,'base64'));await writeFile(path.join(directory,'before-attack.png'),Buffer.from(quiet,'base64'));
 const returned=await page.evaluate(release=>window.renderFrame(8.5+release+1/60),config.portalReturn);
 if(quiet!==returned)throw new Error('La photo ne revient pas exactement en place après l’attaque.');
 const a=await sharp(Buffer.from(peak,'base64')).removeAlpha().raw().toBuffer(),b=await sharp(Buffer.from(quiet,'base64')).removeAlpha().raw().toBuffer();
 let difference=0;for(let i=0;i<a.length;i++)difference+=Math.abs(a[i]-b[i]);difference/=a.length;
 if(difference<10)throw new Error('L’impulsion visuelle reste trop faible.');
 const overlay=JSON.parse(await readFile('data/saved-settings.json','utf8')).presets.stereoGlow.config;
 await page.evaluate(async overlay=>{window.engine.setSpectrumOverlay(overlay);return window.renderFrame(8.5);},overlay);
 if(errors.length)throw new Error(errors.join('\n'));
 if(before!==createHash('sha256').update(await readFile('data/saved-settings.json')).digest('hex'))throw new Error('Sauvegardes modifiées.');
 const report={result,renderer:job.renderer,realAttackTime:beat.time,realAttackFrame:beatFrame,seekIdentical:true,onsetAtExactFrame:true,returnsToIdenticalImage:true,attackPixelDifference:difference,errors,savedSettingsHash:before};
 await writeFile(path.join(directory,'verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
