// Hex grid conversion/rounding and centre sampling adapted from Ditherer,
// hexPixelate.ts, MIT. Copyright 2026 Ng Guoyou, contributors.
// See vendor/ditherer/hexPixelate.ts and LICENSE.
// Cell aperture, faceted shading, antialiasing and audio mapping: MusicFrame Render.
uniform sampler2D inputTexture;
uniform float cellSize,fill,edges,relief,reaction,mixAmount,bass,high;
varying vec2 vUv;
const float SQRT3=1.7320508;
vec2 roundHex(float q,float r){
  float y=-q-r; float xRound=floor(q+.5),yRound=floor(y+.5),zRound=floor(r+.5);
  float dx=abs(xRound-q),dy=abs(yRound-y),dz=abs(zRound-r);
  if(dx>dy&&dx>dz)xRound=-yRound-zRound;else zRound=-xRound-yRound;
  return vec2(xRound,zRound);
}
void main(){
  vec2 resolution=vec2(1920.,1080.);
  float size=cellSize*.5;
  vec2 pixel=vUv*resolution;
  vec2 p=pixel-vec2(size);
  vec2 hex=roundHex((SQRT3/3.*p.x-p.y/3.)/size,(2./3.*p.y)/size);
  vec2 center=vec2(size*SQRT3*(hex.x+hex.y*.5)+size,size*1.5*hex.y+size);
  vec2 local=(pixel-center)/size;
  vec2 a=abs(local);
  float radius=max(a.x,.5*a.x+.8660254*a.y)/.8660254;
  float aperture=clamp(fill*(1.-reaction*.28+bass*reaction*.33),.05,.995);
  float aa=max(fwidth(radius),.003);
  float mask=1.-smoothstep(aperture-aa,aperture+aa,radius);
  vec3 photo=texture2D(inputTexture,clamp(center/resolution,vec2(0.),vec2(1.))).rgb;
  float light=dot(photo,vec3(.299,.587,.114));
  float facet=.5+.5*cos(atan(local.y,local.x)*3.+.7);
  float shade=mix(1.,.68+facet*.32,relief);
  vec3 color=photo*shade*(1.+bass*reaction*.12);
  float rim=smoothstep(aperture-.12,aperture-.035,radius)*mask;
  color=color*mask+vec3(.3,.78,.9)*rim*edges*(.15+high*reaction*.55)*smoothstep(.03,.3,light);
  vec3 source=texture2D(inputTexture,vUv).rgb;
  gl_FragColor=vec4(mix(source,color,mixAmount),1.);
}
