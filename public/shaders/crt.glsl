// Adapted from Ditherer vintageTVGL.ts, MIT, Copyright 2026 Ng Guoyou, contributors.
// YIQ decoding and raster beam formula retained; geometry, audio mapping and
// single-pass cross glow: MusicFrame Render. Original and license in vendor/ditherer.
uniform sampler2D inputTexture;
uniform vec2 resolution;
uniform float curvature,scanlines,glow,fringe,noise,reaction,bass,mid,high,time;
varying vec2 vUv;
vec3 rgbToYiq(vec3 c){return vec3(dot(c,vec3(.299,.587,.114)),dot(c,vec3(.596,-.275,-.321)),dot(c,vec3(.212,-.523,.311)));}
vec3 yiqToRgb(vec3 c){return vec3(c.x+.956*c.y+.621*c.z,c.x-.272*c.y-.647*c.z,c.x-1.106*c.y+1.703*c.z);}
vec3 toLinear(vec3 c){return mix(pow((c+.055)/1.055,vec3(2.4)),c/12.92,lessThanEqual(c,vec3(.04045)));}
vec3 toSrgb(vec3 c){c=max(c,vec3(0.));return mix(1.055*pow(c,vec3(1./2.4))-.055,c*12.92,lessThanEqual(c,vec3(.0031308)));}
float hash(vec2 p,float seed){return fract(sin(dot(p,vec2(12.9898,78.233))+seed)*43758.5453);}
void main(){
  vec2 p=vUv*2.-1.;
  float bend=curvature*(.14+bass*reaction*.1);
  vec2 uv=(p*(1.+bend*dot(p,p)))*.5+.5;
  float edge=min(min(uv.x,1.-uv.x),min(uv.y,1.-uv.y));
  float mask=smoothstep(0.,.008,edge);
  uv.x+=sin(uv.y*19.+time*2.)*bass*reaction*.004;
  vec3 source=texture2D(inputTexture,clamp(uv,0.,1.)).rgb;
  float shift=fringe*(2.+high*reaction*10.)/1920.;
  vec2 chroma=vec2(0.);
  for(int i=-2;i<=2;i++){
    float weight=3.-abs(float(i));
    chroma+=rgbToYiq(texture2D(inputTexture,clamp(uv+vec2(shift+float(i)*1.5/1920.,0.),0.,1.)).rgb).yz*weight;
  }
  chroma/=9.;
  float y=rgbToYiq(source).x;
  y+=sin(uv.y*12.5663706+time*1.65)*mid*reaction*.035;
  y+=(hash(floor(uv*vec2(1920.,1080.)),floor(time*60.)*19.37+3.1)-.5)*noise*(.1+high*reaction*.15);
  vec3 color=toLinear(clamp(yiqToRgb(vec3(y,chroma)),0.,1.));
  vec2 t=vec2(4./1920.,4./1080.);
  vec3 halo=toLinear(source)*.4;
  halo+=toLinear(texture2D(inputTexture,clamp(uv+vec2(t.x,0.),0.,1.)).rgb)*.15;
  halo+=toLinear(texture2D(inputTexture,clamp(uv-vec2(t.x,0.),0.,1.)).rgb)*.15;
  halo+=toLinear(texture2D(inputTexture,clamp(uv+vec2(0.,t.y),0.,1.)).rgb)*.15;
  halo+=toLinear(texture2D(inputTexture,clamp(uv-vec2(0.,t.y),0.,1.)).rgb)*.15;
  color+=halo*glow*(.42+bass*reaction*.8);
  float lines=270.;
  float resolvable=smoothstep(.8,2.4,resolution.y/lines);
  float phase=fract(uv.y*lines);
  float beam=exp(-.5*pow(abs(phase-.5)/.22,2.));
  color*=1.-scanlines*resolvable*(1.-beam);
  color*=1.-curvature*.25*dot(p,p);
  gl_FragColor=vec4(clamp(toSrgb(color),0.,1.)*mask,1.);
}
