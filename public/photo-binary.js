import * as THREE from 'three';

// Original MusicFrame Render effect, rendered with Three.js (MIT).
// Reconstruct photo RGB from its eight weighted bitplanes after local offsets.
export class PhotoBinary {
  constructor() {
    this.material=new THREE.ShaderMaterial({
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader:`
uniform sampler2D inputTexture;
uniform float columns,layers,shift,chroma,reaction,mixAmount,strength,drive,impact,pattern,phase;
varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec3 bits(vec3 color,float weight){vec3 bytes=floor(clamp(color,0.,1.)*255.+.001);return mod(floor(bytes/weight),2.);}
void main(){
 vec3 original=texture2D(inputTexture,vUv).rgb;
 float activity=clamp((drive+impact*.7)*reaction,0.,1.5);
 vec2 grid=vec2(columns,max(12.,columns*.5625));
 vec2 cell=floor(vUv*grid);
 vec3 rebuilt=vec3(0.);
 for(int plane=0;plane<8;plane++){
   float p=float(plane),weight=exp2(7.-p);
   vec2 offset=vec2(0.);
   if(p<layers){
     float seed=hash(cell+vec2(p*17.3,floor(pattern)*.31));
     float angle=seed*6.2831853+p*2.39996+phase;
     float gate=smoothstep(seed-.12,seed+.12,activity);
     offset=vec2(cos(angle),sin(angle))*shift*strength*activity*gate*(.8+p*.22)*3./grid;
   }
   vec2 uv=clamp(vUv+offset,0.,1.);
   vec3 source=texture2D(inputTexture,uv).rgb;
   // Red/blue use different directions; green follows the shared displacement.
   vec3 alternate=texture2D(inputTexture,clamp(vUv-offset.yx,0.,1.)).rgb;
   source.rb=mix(source.rb,alternate.rb,chroma);
   rebuilt+=bits(source,weight)*(weight/255.);
 }
 gl_FragColor=vec4(mix(original,rebuilt,mixAmount*strength*min(activity,1.)),1.);
}`,
      uniforms:{inputTexture:{value:null},columns:{value:480},layers:{value:6},shift:{value:.65},
        chroma:{value:.45},reaction:{value:1},mixAmount:{value:.85},strength:{value:1},
        drive:{value:0},impact:{value:0},pattern:{value:0},phase:{value:0}},
      depthTest:false,depthWrite:false,
    });
  }
  configure(config,time,bands,onset){
    const u=this.material.uniforms;
    u.columns.value=config.binaryColumns??480;u.layers.value=config.binaryLayers??6;
    u.shift.value=config.binaryShift??.65;u.chroma.value=config.binaryChroma??.45;
    u.reaction.value=config.binaryReaction??1;u.mixAmount.value=config.binaryMix??.85;
    u.strength.value=config.intensity;u.drive.value=bands[1]*.6+bands[2]*.2+bands[3]*.15;
    u.impact.value=onset.impact;u.pattern.value=onset.pattern%2048;u.phase.value=time*config.speed*.35;
    return this.material;
  }
  dispose(){this.material.dispose();}
}
