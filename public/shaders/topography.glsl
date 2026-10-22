// Luminance bands, chroma-preserving fill and derivative-based isolines
// adapted from gyng/ditherer contourLinesGL.ts, MIT.
// Copyright 2026 Ng Guoyou, contributors. See vendor/ditherer/LICENSE.
// Palettes, phase scan and MP3 modulation: MusicFrame Render.
uniform sampler2D inputTexture;
uniform float levels,lineWidth,contrast,reaction,scan,background,palette,bass,mid,high,time,pixelScale;
varying vec2 vUv;
vec3 bandColour(vec3 source,float sourceLuma,float bandLuma){
  vec3 chroma=source-vec3(sourceLuma); float scale=1.;
  for(int channel=0;channel<3;channel++){
    float component=chroma[channel];
    if(component>0.)scale=min(scale,(1.-bandLuma)/component);
    if(component<0.)scale=min(scale,bandLuma/-component);
  }
  return clamp(vec3(bandLuma)+chroma*max(0.,scale),0.,1.);
}
void main(){
  vec3 source=texture2D(inputTexture,vUv).rgb;
  float sourceLuma=dot(source,vec3(.2126,.7152,.0722));
  float height=clamp((sourceLuma-.5)*(.8+contrast*1.6)+.5,0.,1.);
  float intervals=max(2.,floor(levels+.5)-1.);
  float phase=mod(time*scan*.25,1.)+(bass*.65+mid*.2)*reaction;
  float scaled=height*intervals+phase;
  float bandIndex=floor(scaled+.5);
  float bandLuma=clamp((bandIndex-phase)/intervals,0.,1.);
  bandLuma=floor(bandLuma*255.+.5)/255.;
  vec3 fill=bandColour(source,sourceLuma,bandLuma);
  vec3 lineColor=vec3(.9,.98,1.);
  if(palette>.5&&palette<1.5){
    fill=mix(vec3(.005,.015,.06),vec3(.08,.74,.85),bandLuma);
    lineColor=vec3(.65,1.,.9);
  }else if(palette>1.5&&palette<2.5){
    fill=mix(vec3(.025,.008,.09),vec3(.8,.12,.28),smoothstep(0.,.6,bandLuma));
    fill=mix(fill,vec3(1.,.83,.35),smoothstep(.45,1.,bandLuma));
  }else if(palette>2.5){fill=vec3(bandLuma*.65);}
  float scalarDistance=abs(fract(scaled)-.5);
  float scalarPerPixel=max(fwidth(scaled),1e-5);
  float pixelDistance=scalarDistance/scalarPerPixel;
  float halfWidth=lineWidth*pixelScale*.5*(1.+high*reaction*.25);
  float coverage=1.-smoothstep(max(0.,halfWidth-.5),halfWidth+.5,pixelDistance);
  coverage*=step(1e-4,scalarPerPixel);
  vec3 base=mix(fill,source,background);
  gl_FragColor=vec4(mix(base,lineColor,coverage*.95),1.);
}
