import { PhotoSpectrum } from './photo-spectrum.js';

// Original MusicFrame Render adaptive photo mosaic. The bounded subdivision tree
// is evaluated from photo samples and measured FFT values, with no history.
export class PhotoQuadtree extends PhotoSpectrum {
  constructor(){
    super();
    Object.assign(this.material.uniforms,{levels:{value:4},detail:{value:.65},edges:{value:.35},mixAmount:{value:1}});
    this.material.fragmentShader=`
uniform sampler2D inputTexture,spectrum;
uniform float columns,levels,detail,edges,mixAmount,reaction,strength,impact;
varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float photoLuma(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
void main(){
 vec3 original=texture2D(inputTexture,vUv).rgb;
 vec2 grid=vec2(columns,columns*.5625),cell=vec2(0.),center=vec2(0.);
 vec3 color=vec3(0.);float energy=0.;
 for(int level=0;level<5;level++){
   cell=floor(vUv*grid);center=(cell+.5)/grid;
   color=texture2D(inputTexture,clamp(center,0.,1.)).rgb;
   energy=texture2D(spectrum,vec2(clamp(center.x,0.,1.),.5)).r*1.5*reaction;
   if(float(level)>=levels)break;
   vec3 diagonal=texture2D(inputTexture,clamp(center+vec2(.32)/grid,0.,1.)).rgb;
   vec3 opposite=texture2D(inputTexture,clamp(center-vec2(.32)/grid,0.,1.)).rgb;
   float contrast=max(abs(photoLuma(diagonal)-photoLuma(opposite)),abs(photoLuma(color)-photoLuma(diagonal)));
   float subdivision=contrast*(1.+detail*7.)+energy*.24+impact*.24;
   if(subdivision<.09+hash(cell+float(level)*7.3)*.23)break;
   grid*=2.;
 }
 vec2 local=fract(vUv*grid),aa=max(fwidth(vUv)*grid,vec2(.001));
 vec2 border=min(local,1.-local);
 float line=1.-min(smoothstep(0.,aa.x*.8,border.x),smoothstep(0.,aa.y*.8,border.y));
 vec3 result=color*(1.-line*edges*.65)*(1.+energy*.14);
 result+=vec3(.12,.38,.42)*line*edges*impact*.4;
 gl_FragColor=vec4(mix(original,result,mixAmount*strength),1.);
}`;
  }
  configure(config,time,analysis,onset){
    const material=super.configure({...config,specColumns:config.quadBase??64,specReaction:config.quadReaction??1},time,analysis,onset);
    const u=material.uniforms;u.levels.value=config.quadLevels??4;u.detail.value=config.quadDetail??.65;
    u.edges.value=config.quadEdges??.35;u.mixAmount.value=config.quadMix??1;return material;
  }
}
