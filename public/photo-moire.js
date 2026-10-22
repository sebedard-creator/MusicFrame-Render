import { PhotoSpectrum } from './photo-spectrum.js';

// Original MusicFrame Render interference screens. PhotoSpectrum supplies only
// the current measured FFT texture; there is no autonomous phase oscillator.
export class PhotoMoire extends PhotoSpectrum {
  constructor(){
    super();
    Object.assign(this.material.uniforms,{chroma:{value:.35},mixAmount:{value:.9}});
    this.material.fragmentShader=`
uniform sampler2D inputTexture,spectrum;
uniform float columns,fill,travel,chroma,mixAmount,reaction,strength,impact;
varying vec2 vUv;
const float tau=6.28318530718;
float grating(float phase,float width){return sin(phase)*(1.-smoothstep(1.5,4.,width));}
void main(){
 vec3 original=texture2D(inputTexture,vUv).rgb;
 float energy=texture2D(spectrum,vec2(vUv.x,.5)).r*1.5*reaction;
 float low=texture2D(spectrum,vec2(.2,.5)).r*1.5*reaction;
 float high=texture2D(spectrum,vec2(.8,.5)).r*1.5*reaction;
 vec2 p=(vUv-.5)*vec2(1.,.5625);
 float angle=.012+travel*.22+high*.025;
 float a=p.x*columns*tau;
 float b=dot(p,vec2(cos(angle),sin(angle)))*columns*1.025*tau;
 float phase=(energy*1.4+low*.6+impact*.3)*tau;
 float first=grating(a,fwidth(a));
 float second=grating(b+phase,fwidth(b));
 float gray=.5+.5*first*second;
 vec3 colored=.5+.5*first*vec3(second,grating(b+phase+2.094395,fwidth(b)),grating(b+phase+4.188790,fwidth(b)));
 vec3 modulation=mix(vec3(gray),colored,chroma);
 vec3 result=original*mix(vec3(1.),modulation*1.8+.1,fill);
 gl_FragColor=vec4(mix(original,result,mixAmount*strength),1.);
}`;
  }
  configure(config,time,analysis,onset){
    const material=super.configure({...config,specColumns:config.moireColumns??240,
      specFill:config.moireDepth??.8,specTravel:config.moireAngle??.35,
      specReaction:config.moireReaction??1,
    },time,analysis,onset);
    material.uniforms.chroma.value=config.moireChroma??.35;
    material.uniforms.mixAmount.value=config.moireMix??.9;return material;
  }
}
