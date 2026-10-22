// Panel layout, chrome, headers and connectors adapted from Fosfora Fenestra.
// MIT, Copyright 2025–2026 Kevin Raymond. See vendor/fosfora.
// Photo crops and direct MP3-envelope mapping: MusicFrame Render.
uniform sampler2D inputTexture;
uniform vec2 resolution;
uniform float count,magnify,edges,links,background,reaction;
uniform float bass,mid,high,impact;
varying vec2 vUv;
float hash(float x){return fract(sin(x*1.731+5.37)*43758.5453);}
float segment(vec2 p,vec2 a,vec2 b,float width,float aa){
  vec2 delta=b-a;
  float t=clamp(dot(p-a,delta)/max(dot(delta,delta),.000001),0.,1.);
  return 1.-smoothstep(width,width+aa,length(p-a-t*delta));
}
void main(){
  vec2 scale=vec2(resolution.x/resolution.y,1.),p=vUv*scale;
  float aa=1./resolution.y;
  vec3 result=texture2D(inputTexture,vUv).rgb*background;
  vec2 previous=vec2(-1.);float previousEnv=0.;
  for(int i=0;i<48;i++){
    if(float(i)>=count)break;
    float key=float(i)*17.3;
    vec2 centre=(vec2(.17)+vec2(hash(key),hash(key+9.7))*.66)*scale;
    vec2 halfSize=vec2(.075+hash(key+19.3)*.17,.045+hash(key+38.9)*.10);
    float drive=(bass*.3+mid*.2+impact*.7)*reaction;
    float threshold=.04+hash(key+5.3)*.45;
    float env=smoothstep(threshold,threshold+.14,drive);
    if(env<.0001){previous=centre;previousEnv=0.;continue;}
    float expansion=1.+(1.-env)*.22;
    vec2 halfBox=halfSize*expansion;
    vec2 q=abs(p-centre)-halfBox;
    float signedDistance=max(q.x,q.y);
    float inside=1.-smoothstep(-aa,aa,signedDistance);
    float border=1.-smoothstep(aa*.6,aa*1.6,abs(signedDistance));
    vec2 corner=abs(abs(p-centre)-halfBox);
    float bracket=(1.-smoothstep(aa,aa*2.5,min(corner.x,corner.y)))*step(max(corner.x,corner.y),min(halfBox.x,halfBox.y)*.65)*step(signedDistance,aa);
    vec2 local=(p-centre+halfBox)/(2.*halfBox);
    float header=inside*step(.91,local.y);
    vec3 color=mix(vec3(.1,.85,1.),vec3(1.,.48,.18),hash(key+57.7)*.55);
    color=mix(color,vec3(1.),impact*reaction*.6);
    if(inside>0.){
      vec2 sampleUv=centre/scale+(vUv-centre/scale)/(1.+magnify*(.3+bass*.25+impact*.8)*reaction);
      vec3 crop=texture2D(inputTexture,clamp(sampleUv,0.,1.)).rgb;
      result=mix(result,crop,inside*env*.9);
    }
    result+=color*(max(border*.55,bracket)+header*.18)*env*edges*(.65+impact*reaction*.5);
    if(previous.x>=0.)result+=color*segment(p,previous,centre,aa*.35,aa)*min(env,previousEnv)*links*.45;
    previous=centre;previousEnv=env;
  }
  gl_FragColor=vec4(result,1.);
}
