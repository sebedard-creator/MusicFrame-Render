// Patch colours, staggered periodic tile envelopes and arrival highlights
// adapted from Fosfora Intarsia, MIT, Copyright 2025–2026 Kevin Raymond.
// Photo averaging and MP3-band mapping: MusicFrame Render.
uniform sampler2D inputTexture;
uniform vec2 resolution;
uniform float columns,fillAmount,density,glow,reaction,background,phase,amount;
uniform float bass,high,impact;
varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
  vec2 grid=vec2(columns,max(4.,floor(columns*resolution.y/resolution.x+.5)));
  vec2 cell=floor(vUv*grid),local=fract(vUv*grid),centre=(cell+.5)/grid;
  vec2 offset=.23/grid;
  vec3 patchColor=(texture2D(inputTexture,centre+offset).rgb+texture2D(inputTexture,centre-offset).rgb
    +texture2D(inputTexture,centre+vec2(offset.x,-offset.y)).rgb+texture2D(inputTexture,centre+vec2(-offset.x,offset.y)).rgb)*.25;
  float age=fract(phase-hash(cell));
  float duration=clamp(density*.8+(bass*.12+impact*.25)*reaction,.08,.995);
  float ramp=min(.09,duration*.25);
  float on=smoothstep(0.,ramp,age)*(1.-smoothstep(duration-ramp,duration,age));
  float halfSize=clamp(fillAmount*(.86+bass*reaction*.1),.1,1.)*.5;
  float distance=max(abs(local.x-.5),abs(local.y-.5));
  float aa=max(grid.x/resolution.x,grid.y/resolution.y)*.55;
  float tile=1.-smoothstep(halfSize-aa,halfSize+aa,distance);
  float arrive=exp(-age*10.);
  vec3 color=patchColor*(1.+glow*(arrive*.6+impact*reaction*.5+high*reaction*.15));
  vec3 source=texture2D(inputTexture,vUv).rgb;
  vec3 result=source*background+color*tile*on;
  gl_FragColor=vec4(mix(source,result,amount),1.);
}
