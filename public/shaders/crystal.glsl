// Animated 3x3 Voronoi search, onset displacement and spectral edges adapted
// from Fosfora shards.wgsl, MIT, Copyright 2025–2026 Kevin Raymond.
// Photo cell colours, resolution-aware edges and MP3 mapping: MusicFrame Render.
uniform sampler2D inputTexture;
uniform vec2 resolution;
uniform float columns,edges,motion,pulse,saturation,mixAmount,phase,bass,high,impact;
varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
  vec2 grid=vec2(columns,max(4.,floor(columns*resolution.y/resolution.x+.5)));
  vec2 sp=vUv*grid,ip=floor(sp),fp=fract(sp);
  float first=8.,second=8.;vec2 nearest=sp;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
    vec2 neighbour=vec2(float(x),float(y)),id=ip+neighbour;
    float h=hash(id)*6.2831853+phase*.3;
    float h2=hash(id+vec2(7.13,3.71));
    vec2 centre=neighbour+.5+.3*motion*vec2(sin(h),cos(h*1.3+h2));
    centre+=vec2(sin(h2*10.+phase*3.),cos(h2*13.+phase*2.5))*impact*pulse*.12;
    float d=length(centre-fp);
    if(d<first){second=first;first=d;nearest=ip+centre;}
    else if(d<second)second=d;
  }
  vec3 source=texture2D(inputTexture,vUv).rgb;
  vec3 color=texture2D(inputTexture,clamp(nearest/grid,0.,1.)).rgb;
  float lum=dot(color,vec3(.2126,.7152,.0722));
  color=mix(vec3(lum),color,saturation);
  float gap=second-first;
  float aa=max(fwidth(gap),.001);
  float line=1.-smoothstep(.0,aa*.7+.012,gap);
  vec3 rim=mix(vec3(.22,.78,1.),vec3(1.,.8,.5),clamp(high*.5,0.,1.));
  vec3 result=color*(1.+impact*pulse*.12)+rim*line*edges*(.35+bass*.35+impact*pulse*.8);
  gl_FragColor=vec4(mix(source,result,mixAmount),1.);
}
