import { PhotoSpectrum } from './photo-spectrum.js';

// Original MusicFrame Render photo shear. Current FFT values drive the strip poses;
// no temporal history is used. PhotoSpectrum only uploads the audio texture.
export class PhotoShear extends PhotoSpectrum {
  constructor(){
    super();
    Object.assign(this.material.uniforms,{chroma:{value:.45},distribution:{value:1}});
    this.material.fragmentShader=`
uniform sampler2D inputTexture,spectrum;
uniform float columns,fill,travel,chroma,distribution,reaction,strength,impact;
varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec2 photoPose(float energy,float slope){
 vec2 p=vUv-.5;
 p.y/=(1.+energy*fill*.7);
 p.y+=slope*fill*.075;
 p.x+=slope*travel*.07*p.y*2.;
 return clamp(p+.5,0.,1.);
}
void main(){
 vec3 original=texture2D(inputTexture,vUv).rgb;
 float strip=floor(vUv.x*columns);
 float frequency=distribution>.5?hash(vec2(strip,17.3)):(strip+.5)/columns;
 float energy=texture2D(spectrum,vec2(frequency,.5)).r*1.5*reaction;
 float before=texture2D(spectrum,vec2(clamp(frequency-.015625,0.,1.),.5)).r*1.5*reaction;
 float after=texture2D(spectrum,vec2(clamp(frequency+.015625,0.,1.),.5)).r*1.5*reaction;
 float slope=after-before;
 vec2 uv=photoPose(energy,slope);
 vec2 fringe=vec2(chroma*(energy+impact*.25)*5./1920.,0.);
 vec3 result=texture2D(inputTexture,uv).rgb;
 result.r=texture2D(inputTexture,clamp(uv+fringe,0.,1.)).r;
 result.b=texture2D(inputTexture,clamp(uv-fringe,0.,1.)).b;
 gl_FragColor=vec4(mix(original,result,strength),1.);
}`;
  }
  configure(config,time,analysis,onset){
    const material=super.configure({...config,specColumns:config.shearColumns??384,
      specFill:config.shearStretch??.45,specTravel:config.shearTilt??.4,
      specReaction:config.shearReaction??1,
    },time,analysis,onset);
    material.uniforms.chroma.value=config.shearChroma??.45;
    material.uniforms.distribution.value=config.shearLayout??1;return material;
  }
}
