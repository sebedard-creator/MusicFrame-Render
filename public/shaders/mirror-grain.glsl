// Mirror folding, rotation and bass scaling adapted from Fosfora prism.wgsl.
// MIT, Copyright 2025–2026 Kevin Raymond. See vendor/fosfora.
// Photographic grain sampling and MP3 mapping: MusicFrame Render.
uniform sampler2D inputTexture;
uniform vec2 resolution;
uniform float folds,scale,density,fillAmount,angle,reaction,bass,high,impact,amount;
varying vec2 vUv;
void main(){
  float aspect=resolution.x/resolution.y;
  vec2 p=(vUv-.5)*vec2(aspect,1.);
  float c=cos(angle),s=sin(angle);
  p=vec2(p.x*c-p.y*s,p.x*s+p.y*c);
  float sector=6.2831853/folds;
  float a=mod(atan(p.y,p.x)+6.2831853,sector);
  a=min(a,sector-a);
  vec2 folded=vec2(cos(a),sin(a))*length(p);
  vec2 uv=folded*vec2(1./aspect,1.)*(.65+scale*2.)*(1.+bass*reaction*.2)+.5;
  // Mirrored repeat keeps the photo defined outside its original bounds.
  uv=1.-abs(mod(uv,2.)-1.);
  vec2 grid=vec2(density,max(4.,floor(density/aspect+.5)));
  vec2 local=fract(uv*grid)-.5;
  vec2 sampleUv=(floor(uv*grid)+.5)/grid;
  vec3 color=texture2D(inputTexture,clamp(sampleUv,0.,1.)).rgb;
  float radius=clamp(fillAmount*(.85+bass*reaction*.15),.08,1.)*.5;
  float distance=length(local);
  float aa=max(fwidth(distance),.015);
  float grain=1.-smoothstep(radius-aa*.5,radius+aa*.5,distance);
  vec3 result=color*grain*(1.+high*reaction*.2+impact*reaction*.2);
  gl_FragColor=vec4(mix(texture2D(inputTexture,vUv).rgb,result,amount),1.);
}
