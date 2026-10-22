import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import sharp from 'sharp';
import {validateConfig} from '../server/config.js';
import {presets,presetNames} from '../public/presets.js';
const base='http://127.0.0.1:5180',state=await(await fetch(base+'/api/service')).json();
const project=await(await fetch(base+'/api/projects/'+state.latestCompletedJob.projectId)).json();
const saved=JSON.parse(await readFile('data/saved-settings.json','utf8')).presets;
const directory=path.resolve('test-output/rebrand-response');await mkdir(directory,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--enable-gpu']}),errors=[];
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080}});page.setDefaultTimeout(0);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(base+'/render.html');await page.waitForFunction(()=>typeof window.initializeRender==='function');
 await page.evaluate(({project,config})=>window.initializeRender(project,config),{project,config:validateConfig({...presets.led,...saved.led.config,preset:'led'})});
 const time=await page.evaluate(()=>window.engine.impacts.events.find(e=>e.time>=140).time+.025);
 await page.evaluate(config=>window.engine.setSpectrumOverlay(config),saved.stereoGlow.config);
 const report={atSeconds:time,effects:[],errors};const thumbs=[];
 for(const key of Object.keys(presets).filter(k=>k!=='stereoGlow')){
  const results=[];
  for(const mode of ['legacy','adaptive-v1','adaptive-v1']){
   const config=validateConfig({...presets[key],...saved[key].config,preset:key,fps:60,imageSeconds:8,audioResponse:mode});
   const frame=await page.evaluate(async({config,time,seek})=>{window.engine.setConfig(config);if(seek)await window.engine.draw(time+1,{imageIndex:0});await window.engine.draw(time,{imageIndex:0});return window.engine.renderer.domElement.toDataURL('image/png').split(',')[1];},{config,time,seek:results.length===2});
   results.push(Buffer.from(frame,'base64'));
  }
  if(!results[1].equals(results[2]))throw Error('Rendu non répétable après seek : '+key);
  const pixels=await Promise.all(results.slice(0,2).map(buffer=>sharp(buffer).removeAlpha().raw().toBuffer()));let difference=0;for(let i=0;i<pixels[0].length;i++)difference+=Math.abs(pixels[0][i]-pixels[1][i]);
  report.effects.push({key,name:presetNames[key],pixelDifference:difference/pixels[0].length,seekIdentical:true});
  for(const buffer of results.slice(0,2))thumbs.push(await sharp(buffer).resize(320,180).toBuffer());
  if(key==='crt'){await writeFile(path.join(directory,'crt-before.png'),results[0]);await writeFile(path.join(directory,'crt-after.png'),results[1]);}
 }
 if(errors.length)throw Error(errors.join('\n'));
 await sharp({create:{width:1280,height:1800,channels:3,background:'#090d0b'}}).composite(thumbs.map((input,i)=>({input,left:i%4*320,top:Math.floor(i/4)*180}))).png().toFile(path.join(directory,'all-effects-before-after.png'));
 await writeFile(path.join(directory,'render-verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
