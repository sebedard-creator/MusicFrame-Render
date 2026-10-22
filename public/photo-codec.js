import * as THREE from 'three';

// Original MusicFrame Render photo effect. Actual JPEG encoding uses the browser's
// local canvas codec; rendering uses Three.js (MIT). No remote service or codec pack.
const vertexShader = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
const fragmentShader = `
uniform sampler2D inputTexture, jpeg0, jpeg1, jpeg2, jpeg3, jpeg4;
uniform vec2 resolution;
uniform float amount,drive,impact,pattern,columns,shift,chroma,mixAmount,zoom,exposure;
varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec3 codec(vec2 p,float degradation){
  float q=clamp(degradation,0.,1.)*4.;
  vec3 a=texture2D(jpeg4,p).rgb;
  vec3 b=texture2D(jpeg3,p).rgb;
  vec3 c=texture2D(jpeg2,p).rgb;
  vec3 d=texture2D(jpeg1,p).rgb;
  vec3 e=texture2D(jpeg0,p).rgb;
  return q<1.?mix(a,b,q):q<2.?mix(b,c,q-1.):q<3.?mix(c,d,q-2.):mix(d,e,q-3.);
}
void main(){
  vec3 original=texture2D(inputTexture,vUv).rgb;
  vec2 grid=vec2(columns,columns*resolution.y/resolution.x);
  vec2 cell=floor(vUv*grid);
  float seed=hash(cell+floor(pattern)*.73);
  float gate=smoothstep(seed-.15,seed+.15,drive);
  vec2 uv=.5+(vUv-.5)/zoom;
  vec2 move=vec2(hash(cell+9.1)-.5,hash(cell+37.7)-.5);
  move=floor(move*8.)/grid*shift*amount*(drive*1.5+impact*3.)*gate;
  vec2 source=clamp(uv+move,0.,1.);
  float crush=clamp(amount*(.1+drive*.95+impact*.2),0.,1.);
  crush=clamp(crush+(seed-.5)*drive*.35,0.,1.);
  vec3 result=codec(source,crush);
  vec2 fringe=vec2(chroma*amount*gate*(drive+impact)*3./1920.,0.);
  result.r=codec(clamp(source+fringe,0.,1.),crush).r;
  result.b=codec(clamp(source-fringe,0.,1.),crush).b;
  result*=exposure;
  gl_FragColor=vec4(mix(original,result,mixAmount*amount),1.);
}`;

export class PhotoCodec {
  constructor() {
    this.cache = new Map();
    this.material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms: {
      inputTexture: { value: null }, ...Object.fromEntries([0,1,2,3,4].map(i=>[`jpeg${i}`,{value:null}])),
      resolution: { value: new THREE.Vector2(1920,1080) }, amount: { value: 0 }, drive: { value: 0 },
      impact: { value: 0 }, pattern: { value: 0 }, columns: { value: 240 }, shift: { value: .4 },
      chroma: { value: .35 }, mixAmount: { value: 1 }, zoom: { value: 1 }, exposure: { value: 1 },
    } });
  }
  async prepare(image, fit) {
    const key = `${image.src}|${fit}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const canvas = document.createElement('canvas'); canvas.width=1920; canvas.height=1080;
    const ctx=canvas.getContext('2d',{alpha:false}); ctx.fillStyle='#000';ctx.fillRect(0,0,1920,1080);
    const scale=(fit==='contain'?Math.min:Math.max)(1920/image.width,1080/image.height);
    const w=image.width*scale,h=image.height*scale;ctx.drawImage(image,(1920-w)/2,(1080-h)/2,w,h);
    const textures=await Promise.all([.01,.025,.06,.16,.4].map(async quality=>{
      const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Compression JPEG impossible.')),'image/jpeg',quality));
      const url=URL.createObjectURL(blob);
      try {
        const picture=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('JPEG local illisible.'));img.src=url;});
        const texture=new THREE.Texture(picture);texture.colorSpace=THREE.NoColorSpace;texture.generateMipmaps=false;
        texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;return texture;
      } finally {URL.revokeObjectURL(url);}
    }));
    this.cache.set(key,textures);
    if(this.cache.size>2){const oldest=this.cache.keys().next().value;this.cache.get(oldest).forEach(texture=>texture.dispose());this.cache.delete(oldest);}
    return textures;
  }
  async configure(image,config,time,bands,transient,width,height) {
    const textures=await this.prepare(image,config.fit);
    const u=this.material.uniforms;
    textures.forEach((texture,i)=>{u[`jpeg${i}`].value=texture;});
    const strength=config.intensity, reaction=config.codecReaction??1;
    u.resolution.value.set(width,height);
    u.amount.value=(config.codecCrush??.85)*strength;
    u.drive.value=Math.min(1.5,bands[1]*.55+bands[2]*.2+transient.impact*.65)*reaction;
    u.impact.value=transient.impact*reaction;
    u.pattern.value=transient.pattern;
    u.columns.value=config.codecColumns??240;u.shift.value=config.codecShift??.4;
    u.chroma.value=config.codecChroma??.35;u.mixAmount.value=config.codecMix??1;
    u.zoom.value=1+config.zoom*strength*(.035+bands[1]*.13);
    u.exposure.value=1+strength*bands[0]*.08;
    return this.material;
  }
  dispose(){this.cache.forEach(textures=>textures.forEach(texture=>texture.dispose()));this.material.dispose();}
}
