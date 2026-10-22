import { PhotoRaster } from './photo-raster.js';

// Palette metric, Bayer threshold, sparse kick selection and board lighting:
// Fosfora Pegboard, Kevin Raymond 2025–2026 (MIT), pinned upstream in vendor.
// Direct photo sampling and analytical displacement replace its spring simulation.
export class PhotoPegboard extends PhotoRaster {
  constructor(){
    super();
    Object.assign(this.uniforms,{density:{value:240},trayStrength:{value:.6},ditherAmount:{value:.8},pegThreshold:{value:.22},popForce:{value:.6}});
    this.material.vertexShader=`
attribute float seed;
uniform sampler2D picture;uniform vec2 ratio;
uniform float zoom,size,pixelScale,bass,high,impact,pattern,density,trayStrength,ditherAmount,pegThreshold,popForce;
varying vec3 pegColor;varying float pegLit;
float pegLuma(vec3 c){return dot(c,vec3(.299,.587,.114));}
vec3 trayColor(int i){
 vec3 c=vec3(1.);
 if(i==0)c=vec3(1.,.13,.12);else if(i==1)c=vec3(1.,.45,.05);
 else if(i==2)c=vec3(1.,.88,.15);else if(i==3)c=vec3(.15,.85,.25);
 else if(i==4)c=vec3(.1,.45,1.);else if(i==5)c=vec3(.55,.2,.95);
 else if(i==6)c=vec3(1.,.4,.7);return c;
}
vec3 snapToTray(vec3 color){
 vec3 target=color/max(pegLuma(color),.08),best=vec3(1.);float bestDistance=1e9;
 for(int i=0;i<8;i++){
  vec3 candidate=trayColor(i),delta=candidate/max(pegLuma(candidate),.08)-target;
  float metric=dot(delta*vec3(.299,.587,.114),delta);
  if(metric<bestDistance){bestDistance=metric;best=candidate;}
 }return best;
}
float bayer4(ivec2 cell){
 int x=cell.x&3,y=cell.y&3,a=x^y;
 int v=((a>>1)&1)*8+((y>>1)&1)*4+(a&1)*2+(y&1);
 return (float(v)+.5)/16.;
}
void main(){
 vec2 uv=position.xy*.5*ratio+.5;
 vec4 source=texture2D(picture,clamp(uv,0.,1.));
 if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.)))||source.a<.01){gl_Position=vec4(99.,99.,0.,1.);gl_PointSize=1.;pegColor=vec3(0.);pegLit=0.;return;}
 ivec2 cell=ivec2(floor((position.xy*.5+.5)*vec2(density,floor(density*.5625+.5))));
 float dither=(bayer4(cell)-.5)*ditherAmount*(1.+high*.6);
 pegLit=step(pegThreshold,pegLuma(source.rgb)+dither);
 vec3 chosen=mix(source.rgb,snapToTray(source.rgb),trayStrength);
 float selector=fract(sin(seed*191.3+pattern*3.71)*43758.5453);
 float selected=(1.-step(.05+min(1.,impact)*.22,selector))*pegLit;
 vec2 spray=vec2(sin(seed*37.7+pattern),cos(seed*53.1+pattern*1.7))*.5;
 vec2 outward=normalize(position.xy+vec2(.0001));
 vec2 p=position.xy+(outward*.45+spray)*selected*impact*popForce*.1;
 pegColor=mix(vec3(.025,.025,.03),chosen*(.72+bass*.45)*(1.+selected*impact*.5),pegLit);
 gl_Position=vec4(p*zoom,0.,1.);gl_PointSize=clamp(size*pixelScale*(1.+selected*impact*.15),1.,32.);
}`;
    this.material.fragmentShader=`
varying vec3 pegColor;varying float pegLit;
void main(){vec2 p=gl_PointCoord-.5;float d=length(p);if(d>.5)discard;
 float edge=1.-smoothstep(.35,.5,d);
 float gloss=exp(-dot(p-vec2(-.12,-.15),p-vec2(-.12,-.15))*100.)*.12*pegLit;
 gl_FragColor=vec4(pegColor*(.65+.35*edge)+vec3(gloss),1.);}`;
    this.backgroundMaterial.fragmentShader=`
uniform float bass;varying vec2 photoUv;
void main(){vec2 p=(photoUv-.5)*vec2(1.77777778,1.);
 vec3 plastic=mix(vec3(.055,.055,.065),vec3(.025,.025,.032),photoUv.y);
 float lamp=exp(-dot(p,p)*2.4)*(.05+bass*.09);
 gl_FragColor=vec4(plastic+vec3(1.,.93,.85)*lamp,1.);}`;
  }
  draw(renderer,target,texture,config,time,bands,onset,width,height){
    const u=this.uniforms,reaction=config.pegReaction??1;
    u.density.value=config.pegDensity??240;u.trayStrength.value=config.pegPalette??.6;
    u.ditherAmount.value=config.pegDither??.8;u.pegThreshold.value=config.pegThreshold??.22;u.popForce.value=config.pegPop??.6;
    super.draw(renderer,target,texture,{...config,rasterDensity:config.pegDensity??240,rasterSize:config.pegSize??.6},time,bands.map(value=>value*reaction),{...onset,impact:onset.impact*reaction},width,height);
  }
}
