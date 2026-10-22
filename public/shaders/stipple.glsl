// Density threshold, jittered placement and coverage adapted from Ditherer
// stippleGL.ts / printmakingToneContracts.ts, MIT.
// Copyright 2026 Ng Guoyou, contributors. Originals + license in vendor/ditherer.
// Luminous (inverted) tone, bounded motion, palettes and audio: MusicFrame Render.
uniform sampler2D inputTexture;
uniform float spacing,size,density,reaction,scatter,background,palette,bass,high,time,pixelScale;
varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
  vec2 screen=vec2(1920.,1080.);
  vec2 px=vUv*screen;
  vec2 home=floor(px/spacing);
  float radius=spacing*size;
  float aa=max(.75, .75/pixelScale);
  vec3 result=vec3(0.);
  float best=0.;
  for(int dy=-1;dy<=1;dy++){
    for(int dx=-1;dx<=1;dx++){
      vec2 cell=home+vec2(float(dx),float(dy));
      vec3 source=texture2D(inputTexture,clamp((cell+.5)*spacing/screen,0.,1.)).rgb;
      float light=clamp(dot(source,vec3(.2126,.7152,.0722)),0.,1.);
      float tonal=1.-pow(1.-light,density*(1.+bass*reaction*.9));
      float threshold=hash(cell);
      if(tonal<=threshold)continue;
      vec2 jitter=vec2(hash(cell+vec2(19.3,7.1)),hash(cell+vec2(3.7,41.9)));
      vec2 drift=vec2(sin(time*5.+threshold*24.),cos(time*4.+threshold*19.));
      vec2 position=(cell+clamp(.1+jitter*.8+drift*scatter*high*reaction*.2,.02,.98))*spacing;
      float distanceToDot=length(px-position);
      float coverage=clamp((radius-distanceToDot)/aa+.5,0.,1.);
      vec3 color=source;
      if(palette>.5&&palette<1.5)color=vec3(.1,.85,1.)*(.4+light*.6);
      else if(palette>1.5&&palette<2.5)color=vec3(.85,.94,1.)*(.4+light*.6);
      else if(palette>2.5)color=vec3(1.,.58,.12)*(.4+light*.6);
      if(coverage>best){result=color*coverage*(1.1+high*reaction*.7);best=coverage;}
    }
  }
  vec3 photo=texture2D(inputTexture,vUv).rgb;
  gl_FragColor=vec4(mix(result,photo,background),1.);
}
