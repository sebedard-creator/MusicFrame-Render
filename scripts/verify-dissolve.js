import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import sharp from 'sharp';
import {validateConfig} from '../server/config.js';
import {defaultSequenceTiming} from '../public/effect-sequence.js';
const {holdSeconds,transitionSeconds}=defaultSequenceTiming,slotSeconds=holdSeconds+transitionSeconds,midpoint=holdSeconds+transitionSeconds/2;
const base='http://127.0.0.1:5180',project=(await(await fetch(base+'/api/reference')).json()).project;
const saved=JSON.parse(await readFile('data/saved-settings.json','utf8')).presets;
const segments=['orbit','dataGrains'].map((key,i)=>({name:key,imageIndex:i,config:validateConfig({...saved[key].config,preset:key,imageSeconds:slotSeconds,fps:60})}));
const dir=path.resolve(`test-output/dissolve-proof-${transitionSeconds}s`);await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--enable-gpu']}),errors=[];
try{
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(base+'/render.html');await page.waitForFunction(()=>typeof window.initializeRender==='function');
 await page.evaluate(async({project,segments,slotSeconds,transitionSeconds,midpoint})=>{window.proofTime=midpoint;window.proofSequence={segmentSeconds:slotSeconds,transitionSeconds,segments};return window.initializeRender(project,segments[0].config,window.proofSequence);},{project,segments,slotSeconds,transitionSeconds,midpoint});
 const mixed=await page.evaluate(()=>window.renderFrame(window.proofTime));
 const outgoing=await page.evaluate(async()=>{window.engine.setConfig(window.proofSequence.segments[0].config);await window.engine.draw(window.proofTime,{overlay:false,imageIndex:0,imageTime:window.proofTime});return window.engine.renderer.domElement.toDataURL('image/png').split(',')[1];});
 const incoming=await page.evaluate(async()=>{window.engine.setConfig(window.proofSequence.segments[1].config);await window.engine.draw(window.proofTime,{overlay:false,imageIndex:1,imageTime:0});return window.engine.renderer.domElement.toDataURL('image/png').split(',')[1];});
 const pixels=await Promise.all([mixed,outgoing,incoming].map(x=>sharp(Buffer.from(x,'base64')).removeAlpha().raw().toBuffer()));
 let max=0,total=0,styles=0;for(let i=0;i<pixels[0].length;i++){const error=Math.abs(pixels[0][i]-Math.round((pixels[1][i]+pixels[2][i])/2));max=Math.max(max,error);total+=error;styles+=Math.abs(pixels[1][i]-pixels[2][i]);}
 if(max>1||styles/pixels[0].length<5)throw Error(`Fondu 50/50 incorrect : max ${max}, écart des styles ${styles/pixels[0].length}`);
 await page.evaluate(()=>window.renderFrame(40));if(mixed!==await page.evaluate(()=>window.renderFrame(window.proofTime)))throw Error('Le fondu dépend de l’ordre de rendu.');
 const once=await page.evaluate(async overlay=>{await window.renderFrame(window.proofTime);window.engine.spectrumOverlay.draw(window.engine.renderer,window.engine.analysis,window.proofTime,overlay,1920,1080,false);return window.engine.renderer.domElement.toDataURL('image/png').split(',')[1];},saved.stereoGlow.config);
 await page.evaluate(overlay=>{window.proofSequence.spectrumConfig=overlay;},saved.stereoGlow.config);
 const composed=await page.evaluate(()=>window.renderFrame(window.proofTime));if(composed!==once)throw Error('Le spectre n’est pas dessiné exactement une fois au-dessus du fondu.');
 if(errors.length)throw Error(errors.join('\n'));
 await writeFile(path.join(dir,'half-dissolve.png'),Buffer.from(composed,'base64'));
 const report={atSeconds:midpoint,transitionSeconds,mix:.5,maxPixelError:max,meanPixelError:total/pixels[0].length,differentPhotoSources:true,bothEffectsUseAudioTime:midpoint,seekIdentical:true,spectrumDrawnOnce:true,errors};
 await writeFile(path.join(dir,'verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
