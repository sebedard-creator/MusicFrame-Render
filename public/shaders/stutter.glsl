// Original MusicFrame Render framing/retrigger shader.
// RGB separation is composed separately using Astrofox (MIT).
uniform sampler2D inputTexture;
uniform float amount,pattern,stepIndex,punch,shift,echo,contrast;
varying vec2 vUv;
float random(float seed){return fract(sin(seed*127.1+311.7)*43758.5453);}
void main(){
  float seed=pattern*7.+stepIndex*19.;
  vec2 direction=vec2(random(seed)-.5,random(seed+23.)-.5);
  vec2 p=vUv-.5;
  p/=1.+punch*amount*.32;
  p+=direction*shift*amount*.12;
  vec2 uv=clamp(p+.5,vec2(0.),vec2(1.));
  vec3 color=texture2D(inputTexture,uv).rgb;
  vec2 trail=direction*amount*echo*.08;
  vec3 ghost=texture2D(inputTexture,clamp(uv+trail,vec2(0.),vec2(1.))).rgb;
  vec3 ghost2=texture2D(inputTexture,clamp(uv+trail*2.,vec2(0.),vec2(1.))).rgb;
  color=mix(color,max(ghost*.8,ghost2*.5),echo*amount*.38);
  color=clamp((color-.5)*(1.+contrast*amount*.8)+.5,0.,1.);
  gl_FragColor=vec4(color,1.);
}
