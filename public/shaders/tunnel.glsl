// Log-polar depth, segmented rings, grid and depth shading adapted from
// Fosfora tunnel.wgsl, MIT, Copyright 2025–2026 Kevin Raymond.
// Photo panels and MP3-timed envelope integration: MusicFrame Render.
uniform sampler2D inputTexture;
uniform float aspect,time,travel,panels,depth,twist,grid,photo,reaction,bass,mid,high,impact;
varying vec2 vUv;
void main(){
  vec2 p=(vUv-.5)*vec2(aspect,1.);
  float r=length(p)*(1.+bass*reaction*.06);
  float geometricDepth=-log(r+.001)*(1.+depth*2.);
  float turn=(twist-.5)*10.;
  float angle=atan(p.y,p.x)+time*turn*.15+turn*geometricDepth*.05;
  float z=geometricDepth+travel;
  float segmentPosition=fract(angle/6.2831853)*panels;
  float ringPosition=z*1.5;
  vec2 photoUv=vec2(fract(segmentPosition+.5),fract(ringPosition+.5));
  vec3 picture=texture2D(inputTexture,photoUv).rgb;
  float segmentEdge=abs(fract(segmentPosition)-.5)*2.;
  float ringEdge=abs(fract(ringPosition)-.5)*2.;
  float panelLine=exp(-segmentEdge*segmentEdge*60.);
  float ringLine=exp(-ringEdge*ringEdge*60.);
  float checker=fract((floor(segmentPosition)+floor(ringPosition))*.5)*2.;
  float shade=smoothstep(0.,.45,r);
  vec3 wall=mix(vec3(.045,.075,.13)*(1.+checker*.4),picture,photo);
  wall*=shade*(.75+checker*.2)*(1.+bass*reaction*.15);
  vec3 lineColor=mix(vec3(.22,.65,1.),vec3(1.,.45,.2),clamp(high*.5,0.,1.));
  float lines=max(panelLine,ringLine);
  wall+=lineColor*lines*grid*shade*(.25+mid*reaction*.45);
  wall+=lineColor*ringLine*grid*impact*reaction*.55;
  wall*=smoothstep(0.,.055,r);
  gl_FragColor=vec4(wall,1.);
}
