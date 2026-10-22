// Ordered quantization adapted from gyng/ditherer, MIT.
// Copyright 2026 Ng Guoyou, contributors. See vendor/ditherer/LICENSE.
// Audio mapping, phosphor palettes and scanlines: MusicFrame Render.
uniform sampler2D inputTexture;
uniform sampler2D thresholdMap;
uniform float pitch;
uniform float levels;
uniform float mixAmount;
uniform float reaction;
uniform float bass;
uniform float high;
uniform float phase;
uniform float palette;
uniform float scanlines;
varying vec2 vUv;
void main(){
  // A virtual 1080p grid keeps preview and final export framing identical.
  vec2 px=vUv*vec2(1920.,1080.);
  vec2 cell=floor(px/pitch);
  vec2 uv=(cell+.5)*pitch/vec2(1920.,1080.);
  vec3 original=texture2D(inputTexture,vUv).rgb;
  vec3 src=texture2D(inputTexture,uv).rgb;
  vec2 offset=vec2(mod(phase,4.),floor(mod(phase,16.)/4.));
  float threshold=texture2D(thresholdMap,(mod(cell+offset,4.)+.5)/4.).r;
  // Ditherer's sRGB threshold bias and half-up quantization, normalized to 0..1.
  float stepF=1./(levels-1.);
  float bias=stepF*(threshold-.5);
  float drive=bass*reaction;
  src=clamp((src-.5)*(1.+drive*.65)+.5+drive*.10,0.,1.);
  vec3 color=clamp(floor((src+bias)/stepF+.5)*stepF,0.,1.);
  if(palette>.5){
    float luma=dot(src,vec3(.299,.587,.114));
    float q=clamp(floor((luma+bias)/stepF+.5)*stepF,0.,1.);
    vec3 phosphor=palette<1.5?vec3(.05,.86,1.):vec3(1.,.58,.12);
    color=mix(vec3(.006,.012,.023),phosphor,pow(q,.85));
    color=mix(color,vec3(.94,.98,1.),smoothstep(.72,1.,q)*.65);
  }
  float stripe=smoothstep(.72,.92,fract(px.y/pitch));
  color*=1.-stripe*scanlines*.75;
  color*=1.+high*reaction*.14;
  gl_FragColor=vec4(mix(original,color,mixAmount),1.);
}
