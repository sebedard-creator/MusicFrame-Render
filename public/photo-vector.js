import { PhotoSpectrum } from './photo-spectrum.js';

// Original MusicFrame Render photo glyphs, oriented by local image gradients.
// PhotoSpectrum supplies only the measured, seekable FFT texture upload.
export class PhotoVector extends PhotoSpectrum {
  constructor(){
    super();
    this.material.fragmentShader=`
uniform sampler2D inputTexture,spectrum;
uniform float columns,fill,travel,glow,background,reaction,strength,impact;
varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float photoLuma(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
float segmentDistance(vec2 p,vec2 a,vec2 b){
 vec2 delta=b-a;float t=clamp(dot(p-a,delta)/max(dot(delta,delta),.00001),0.,1.);
 return length(p-a-delta*t);
}
void main(){
 vec3 original=texture2D(inputTexture,vUv).rgb;
 vec2 grid=vec2(columns,columns*.5625),cell=floor(vUv*grid);
 vec2 center=(cell+.5)/grid,offset=vec2(.55)/grid;
 vec3 photo=texture2D(inputTexture,center).rgb;
 float gx=photoLuma(texture2D(inputTexture,clamp(center+vec2(offset.x,0.),0.,1.)).rgb)
         -photoLuma(texture2D(inputTexture,clamp(center-vec2(offset.x,0.),0.,1.)).rgb);
 float gy=photoLuma(texture2D(inputTexture,clamp(center+vec2(0.,offset.y),0.,1.)).rgb)
         -photoLuma(texture2D(inputTexture,clamp(center-vec2(0.,offset.y),0.,1.)).rgb);
 float energy=texture2D(spectrum,vec2(clamp(center.x,0.,1.),.5)).r*1.5*reaction;
 float seed=hash(cell);
 float angle=dot(vec2(gx,gy),vec2(gx,gy))>.00001?atan(gy,gx)+1.570796:seed*6.283185;
 angle+=(energy*1.8+impact*.9)*travel*(seed>.5?1.:-1.);
 vec2 p=fract(vUv*grid)-.5;
 float c=cos(angle),s=sin(angle);p=mat2(c,-s,s,c)*p;
 float halfLength=clamp(.08+fill*.25+energy*.1,.08,.4);
 float head=min(.13,halfLength*.7);
 vec2 tip=vec2(halfLength,0.);
 float dist=min(segmentDistance(p,vec2(-halfLength,0.),tip),
   min(segmentDistance(p,tip,tip+vec2(-head,head)),segmentDistance(p,tip,tip+vec2(-head,-head))));
 float radius=.018+glow*.048;
 float aa=max(length(fwidth(vUv)*grid)*.25,.005);
 float glyph=1.-smoothstep(radius-aa,radius+aa,dist);
 vec3 result=original*background+photo*glyph*(1.2+energy*.65+impact*.3);
 gl_FragColor=vec4(mix(original,result,strength),1.);
}`;
  }
  configure(config,time,analysis,onset){
    return super.configure({...config,specColumns:config.vectorDensity??240,
      specFill:config.vectorLength??.7,specTravel:config.vectorTurn??.8,
      specGlow:config.vectorWidth??.5,specBackground:config.vectorBackground??.12,
      specReaction:config.vectorReaction??1,
    },time,analysis,onset);
  }
}
