// Tonal luminance/character mapping adapted from gyng/ditherer ASCII, MIT.
// Copyright 2026 Ng Guoyou, contributors. See vendor/ditherer/LICENSE.
// Fixed bitmap atlas, GPU rendering and audio modulation: MusicFrame Render.
uniform sampler2D inputTexture,glyphAtlas;
uniform float cellSize,textDensity,reaction,glow,rain,palette,bass,high,time;
varying vec2 vUv;
float glyph(vec2 p,float index){
  p=clamp(p,vec2(.01),vec2(.99));
  return texture2D(glyphAtlas,vec2((index+p.x)/10.,p.y)).r;
}
void main(){
  vec2 screen=vec2(1920.,1080.);
  vec2 size=vec2(cellSize*2./3.,cellSize);
  vec2 grid=screen/size;
  vec2 cell=floor(vUv*grid);
  vec2 center=(cell+.5)/grid;
  vec2 delta=.25/grid;
  vec3 source=(texture2D(inputTexture,center+delta).rgb+texture2D(inputTexture,center-delta).rgb+
    texture2D(inputTexture,center+delta*vec2(1.,-1.)).rgb+texture2D(inputTexture,center+delta*vec2(-1.,1.)).rgb)*.25;
  float light=clamp(dot(source,vec3(.2126,.7152,.0722)),0.,1.);
  float density=textDensity*(1.+bass*reaction*.65);
  float tonal=clamp(1.-pow(1.-light,density),0.,1.);
  float index=floor(tonal*9.+.5);
  vec2 local=fract(vUv*grid); local.y=1.-local.y;
  float ink=glyph(local,index);
  float halo=(glyph(local+vec2(.08,0.),index)+glyph(local-vec2(.08,0.),index)+
    glyph(local+vec2(0.,.07),index)+glyph(local-vec2(0.,.07),index))*.25;
  vec3 color=source;
  if(palette>.5&&palette<1.5)color=vec3(.08,1.,.26)*(.4+light*.7);
  else if(palette>1.5&&palette<2.5)color=vec3(.15,.88,1.)*(.4+light*.7);
  else if(palette>2.5)color=vec3(1.,.64,.12)*(.4+light*.7);
  float seed=fract(sin(cell.x*127.1)*43758.5453);
  float flow=mod(cell.y+time*(4.+seed*12.)+seed*grid.y,grid.y)/grid.y;
  float head=pow(1.-flow,16.)*rain*(.25+bass*reaction+high*reaction);
  color=mix(color,vec3(.8,1.,.88),clamp(head,0.,.8));
  vec3 result=color*(ink+halo*glow*.5)*(1.2+high*reaction*.5);
  gl_FragColor=vec4(result,1.);
}
