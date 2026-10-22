import * as THREE from 'three';

// Real JPEG byte corruption by glitch-canvas 1.1.12, Georg Fischer (MIT).
// Fixed profiles, local texture cache and MP3-driven composition: MusicFrame Render.
let library;
function loadLibrary(){
  if(!library)library=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src='/vendor/glitch-canvas/glitch-canvas-browser.js';
    script.onload=()=>resolve(window.glitch);
    script.onerror=()=>{library=null;reject(new Error('Bibliothèque glitch-canvas introuvable.'));};
    document.head.append(script);
  });
  return library;
}
export class PhotoCorruption {
  constructor(){
    this.cache=new Map();
    this.material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader:`
uniform sampler2D inputTexture,glitch0,glitch1,glitch2,glitch3;
uniform float drive,impact,pattern,columns,coverage,mixAmount,chroma,strength,zoom,exposure;
varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec3 damaged(vec2 p,float which){
 vec3 result=texture2D(glitch0,p).rgb;
 if(which>=.5&&which<1.5)result=texture2D(glitch1,p).rgb;
 else if(which>=1.5&&which<2.5)result=texture2D(glitch2,p).rgb;
 else if(which>=2.5)result=texture2D(glitch3,p).rgb;
 return result;
}
void main(){
 vec3 original=texture2D(inputTexture,vUv).rgb;
 vec2 cell=floor(vUv*vec2(columns,max(12.,columns*.5625)));
 float seed=hash(cell+floor(pattern)*.37);
 float activity=clamp(drive+impact*.65,0.,1.5);
 float reveal=clamp(activity*coverage*strength,0.,1.);
 float mask=smoothstep(seed-.09,seed+.09,reveal)*min(activity,1.);
 vec2 uv=clamp(.5+(vUv-.5)/zoom,0.,1.);
 float which=mod(floor(seed*4.)+floor(pattern),4.);
 vec3 color=damaged(uv,which)*exposure;
 float luma=dot(color,vec3(.2126,.7152,.0722));
 color=mix(vec3(luma),color,chroma);
 gl_FragColor=vec4(mix(original,color,mask*mixAmount*strength),1.);
}`,
      uniforms:{inputTexture:{value:null},...Object.fromEntries([0,1,2,3].map(i=>[`glitch${i}`,{value:null}])),
        drive:{value:0},impact:{value:0},pattern:{value:0},columns:{value:320},coverage:{value:.7},
        mixAmount:{value:.85},chroma:{value:1},strength:{value:1},zoom:{value:1},exposure:{value:1}},
    });
  }
  async prepare(image,fit,profile){
    const key=`${image.src}|${fit}|${profile}`;
    if(this.cache.has(key))return this.cache.get(key);
    const glitch=await loadLibrary();
    const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=1080;
    const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#000';ctx.fillRect(0,0,1920,1080);
    const scale=(fit==='contain'?Math.min:Math.max)(1920/image.width,1080/image.height);
    const w=image.width*scale,h=image.height*scale;ctx.drawImage(image,(1920-w)/2,(1080-h)/2,w,h);
    const data=ctx.getImageData(0,0,1920,1080),iterations=[6,18,40][profile],quality=[65,55,40][profile];
    const outcomes=await Promise.allSettled([13,37,61,83].map(async(seed,i)=>{
      let failure;
      for(const count of [iterations+i*2,Math.max(2,Math.floor(iterations/2)),1]){
        try {
          const picture=await glitch({seed,quality,amount:[33,47,65,81][i],iterations:count}).fromImageData(data).toImage();
          const texture=new THREE.Texture(picture);texture.colorSpace=THREE.NoColorSpace;texture.generateMipmaps=false;
          texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;return texture;
        } catch(error){failure=error;}
      }
      throw new Error(`JPEG altéré illisible : ${failure?.message||failure}`);
    }));
    const failure=outcomes.find(item=>item.status==='rejected');
    if(failure){for(const item of outcomes)if(item.status==='fulfilled')item.value.dispose();throw failure.reason;}
    const textures=outcomes.map(item=>item.value);this.cache.set(key,textures);
    if(this.cache.size>2){const oldest=this.cache.keys().next().value;this.cache.get(oldest).forEach(t=>t.dispose());this.cache.delete(oldest);}
    return textures;
  }
  async configure(image,config,bands,onset){
    const textures=await this.prepare(image,config.fit,config.corruptProfile??1),u=this.material.uniforms;
    textures.forEach((texture,i)=>{u[`glitch${i}`].value=texture;});
    const reaction=config.corruptReaction??1;
    u.drive.value=(bands[1]*.55+bands[2]*.2+bands[3]*.15)*reaction;u.impact.value=onset.impact*reaction;
    u.pattern.value=onset.pattern%2048;u.columns.value=config.corruptColumns??320;
    u.coverage.value=config.corruptCoverage??.7;u.mixAmount.value=config.corruptMix??.85;
    u.chroma.value=config.corruptChroma??1;u.strength.value=config.intensity;
    u.zoom.value=1+config.zoom*config.intensity*(.035+bands[1]*.13);u.exposure.value=1+config.intensity*bands[0]*.08;
    return this.material;
  }
  dispose(){this.cache.forEach(textures=>textures.forEach(texture=>texture.dispose()));this.material.dispose();}
}
