import * as THREE from 'three';
import { sampleSpectrum } from './spectrum.js';

// Original MusicFrame Render photo microbars, fed by the measured FFT envelopes.
export class PhotoSpectrum {
  constructor(){
    this.values=new Uint8Array(64*4);
    this.texture=new THREE.DataTexture(this.values,64,1,THREE.RGBAFormat,THREE.UnsignedByteType);
    this.texture.minFilter=THREE.LinearFilter;this.texture.magFilter=THREE.LinearFilter;
    this.texture.generateMipmaps=false;
    this.material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      uniforms:{inputTexture:{value:null},spectrum:{value:this.texture},columns:{value:240},
        fill:{value:.6},travel:{value:.6},glow:{value:.45},background:{value:.08},
        reaction:{value:1},strength:{value:1},impact:{value:0}},
      fragmentShader:`
uniform sampler2D inputTexture,spectrum;
uniform float columns,fill,travel,glow,background,reaction,strength,impact;
varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
 vec3 original=texture2D(inputTexture,vUv).rgb;
 vec2 grid=vec2(columns,max(12.,floor(columns*.5625)));
 vec2 cell=floor(vUv*grid),local=fract(vUv*grid)-.5;
 float frequency=(cell.x+.5)/grid.x;
 float energy=texture2D(spectrum,vec2(frequency,.5)).r*1.5*reaction;
 float phase=hash(cell)*6.283185;
 float shift=sin(phase)*(energy+impact*.25)*travel*10.;
 vec2 source=clamp((cell+.5+vec2(0.,shift))/grid,0.,1.);
 vec3 photo=texture2D(inputTexture,source).rgb;
 float lum=dot(photo,vec3(.2126,.7152,.0722));
 float halfWidth=.12+fill*.23;
 float halfHeight=clamp(.09+lum*.2+energy*.24+impact*.08,.05,.49);
 vec2 aa=max(fwidth(vUv*grid),vec2(.01));
 float shape=(1.-smoothstep(halfWidth-aa.x,halfWidth+aa.x,abs(local.x)))
            *(1.-smoothstep(halfHeight-aa.y,halfHeight+aa.y,abs(local.y)));
 float halo=exp(-dot(local*vec2(1.6,.7),local*vec2(1.6,.7))*18.)*glow*energy*.3;
 vec3 result=original*background+photo*(shape*(1.1+energy*.8)+halo);
 gl_FragColor=vec4(mix(original,result,strength),1.);
}`});
  }
  configure(config,time,analysis,onset){
    const values=sampleSpectrum(analysis,time,config.sensitivity,config.audioResponse);
    values.forEach((value,i)=>{this.values[i*4]=Math.round(value/1.5*255);this.values[i*4+3]=255;});this.texture.needsUpdate=true;
    const u=this.material.uniforms;
    u.columns.value=config.specColumns??240;u.fill.value=config.specFill??.6;
    u.travel.value=config.specTravel??.6;u.glow.value=config.specGlow??.45;
    u.background.value=config.specBackground??.08;u.reaction.value=config.specReaction??1;
    u.impact.value=onset.impact*(config.specReaction??1);u.strength.value=config.intensity;
    return this.material;
  }
  dispose(){this.texture.dispose();this.material.dispose();}
}
