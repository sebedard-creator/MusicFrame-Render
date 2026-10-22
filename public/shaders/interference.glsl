// RGB channel sampling adapted from Astrofox's rgb-shift.glsl, MIT.
// Copyright (c) 2020 Mike Cao. See vendor/astrofox/LICENSE.
// Faceted refraction, interference and audio mapping: MusicFrame Render.
uniform sampler2D inputTexture;
uniform float drive,mid,high,time,dispersion,refraction,facets,interference,coating,angle;
varying vec2 vUv;
void main(){
  vec2 axis=vec2(cos(angle),sin(angle));
  vec2 tangent=vec2(-axis.y,axis.x);
  vec2 p=(vUv-.5)*vec2(16./9.,1.);
  vec3 source=texture2D(inputTexture,vUv).rgb;
  float light=dot(source,vec3(.299,.587,.114));
  float coordinate=dot(p,axis);
  // Sharp optical facets, with displacement explicitly gated by audio energy.
  float ridge=fract(coordinate*facets+time*.12)-.5;
  vec2 bend=axis*ridge*refraction*.075*drive*(.3+light*.7);
  vec2 uv=clamp(vUv+bend,vec2(0.),vec2(1.));
  vec2 offset=dispersion*.045*drive*axis;
  vec3 color=vec3(
    texture2D(inputTexture,clamp(uv+offset,vec2(0.),vec2(1.))).r,
    texture2D(inputTexture,uv).g,
    texture2D(inputTexture,clamp(uv-offset,vec2(0.),vec2(1.))).b);
  vec3 spectrum=.55+.45*cos(vec3(0.,2.094,4.189)+light*7.+coordinate*3.+time*.2);
  color=mix(color,color*spectrum*1.7,coating*min(1.,drive)*.65);
  float bands=.5+.5*cos(dot(p,tangent)*facets*48.+time*2.+mid*3.);
  float crossing=.5+.5*cos(dot(p,axis)*facets*34.-time+high*2.);
  float lines=smoothstep(.7,1.,bands*crossing);
  color+=spectrum*lines*interference*drive*.38*smoothstep(.04,.4,light);
  gl_FragColor=vec4(color,1.);
}
