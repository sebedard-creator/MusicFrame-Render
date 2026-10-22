// Tile reveal orders, hot edge and double grid adapted from Fosfora Tessera.
// MIT, Copyright 2025–2026 Kevin Raymond. See vendor/fosfora.
// Photo composite and direct MP3-envelope gating: MusicFrame Render.
uniform sampler2D inputTexture;
uniform vec2 resolution;
uniform float columns,obscure,edges,flash,direction,reaction;
uniform float bass,mid,high,impact;
varying vec2 vUv;
float hash(vec2 cell){return fract(sin(dot(cell,vec2(127.1,311.7)))*43758.5453);}
float frame(vec2 uv,vec2 grid,float inset,float width){
  vec2 p=abs(fract(uv*grid)-.5);
  float d=abs(max(p.x,p.y)-(.5-inset));
  float aa=max(grid.x/resolution.x,grid.y/resolution.y)*.65;
  return 1.-smoothstep(width,width+aa,d);
}
void main(){
  vec2 grid=vec2(columns,max(4.,floor(columns*resolution.y/resolution.x+.5)));
  vec2 cell=floor(vUv*grid),centre=(cell+.5)/grid;
  float noise=hash(cell),order=noise;
  if(direction>1.5)order=clamp(distance(centre,vec2(.5))*1.9+(noise-.5)*.08,0.,.999);
  else if(direction>.5)order=clamp((1.-centre.y)*.94+(noise-.5)*.06,0.,.999);
  float drive=clamp((bass*.5+mid*.25+high*.08+impact*.45)*reaction,0.,1.);
  float opened=smoothstep(order-.045,order+.045,drive);
  float ember=(1.-clamp((drive-order)*5.,0.,1.))*opened;
  float line=frame(vUv,grid,.055,.007);
  float coarse=frame(vUv,max(floor(grid/8.),vec2(2.)),.012,.001);
  float chrome=max(line,coarse*.45)*edges;
  vec3 source=texture2D(inputTexture,vUv).rgb;
  vec3 color=mix(vec3(.12,.85,1.),vec3(1.,.45,.12),noise*.35);
  vec3 result=source*(1.-obscure*(1.-opened));
  result+=color*(chrome*(.12+.4*opened+impact*reaction*.5)+ember*flash*.18*(.25+impact*reaction));
  gl_FragColor=vec4(result,1.);
}
