import * as THREE from 'three';

// Original MusicFrame Render shader: four rotated subtractive CMYK dot screens.
// Each plate samples the actual photo at its own screen cell center.
export class PhotoPress {
  constructor(){
    this.material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      uniforms:{inputTexture:{value:null},columns:{value:240},ink:{value:1},registerShift:{value:.65},
        angle:{value:0},drive:{value:0},impact:{value:0},strength:{value:1},mixAmount:{value:1}},
      fragmentShader:`
uniform sampler2D inputTexture;
uniform float columns,ink,registerShift,angle,drive,impact,strength,mixAmount;
varying vec2 vUv;
mat2 turn(float a){float c=cos(a),s=sin(a);return mat2(c,s,-s,c);}
vec4 separate(vec3 rgb){
 float k=1.-max(rgb.r,max(rgb.g,rgb.b));
 vec3 cmy=(vec3(1.)-rgb-vec3(k))/max(1.-k,.0001);
 return vec4(clamp(cmy,0.,1.),k);
}
float plate(float radians,vec2 offset,vec4 channel){
 float pitch=1920./columns;
 mat2 rotation=turn(radians+angle);
 vec2 screen=rotation*((vUv-.5)*vec2(1920.,1080.)-offset)/pitch;
 vec2 cell=floor(screen),local=fract(screen)-.5;
 vec2 center=turn(-radians-angle)*((cell+.5)*pitch)+offset;
 vec2 uv=clamp(center/vec2(1920.,1080.)+.5,0.,1.);
 vec4 cmyk=separate(texture2D(inputTexture,uv).rgb);
 float amount=clamp(dot(cmyk,channel)*ink*(1.+drive*.35+impact*.3),0.,1.);
 float radius=mix(.565*sqrt(amount),.72,smoothstep(.78,1.,amount));
 float distance=length(local),aa=max(fwidth(distance),.01);
 return (1.-smoothstep(radius-aa,radius+aa,distance))*smoothstep(0.,.02,amount);
}
void main(){
 vec3 original=texture2D(inputTexture,vUv).rgb;
 float spread=registerShift*(drive+impact)*6.;
 float c=plate(.261799,vec2(spread,0.),vec4(1.,0.,0.,0.));
 float m=plate(1.308997,vec2(-spread*.5,spread*.866),vec4(0.,1.,0.,0.));
 float y=plate(0.,vec2(-spread*.5,-spread*.866),vec4(0.,0.,1.,0.));
 float k=plate(.785398,vec2(0.),vec4(0.,0.,0.,1.));
 vec3 printed=(vec3(1.)-vec3(c,m,y))*(1.-k);
 gl_FragColor=vec4(mix(original,printed,mixAmount*strength),1.);
}`});
  }
  configure(config,time,bands,onset){
    const u=this.material.uniforms,reaction=config.pressReaction??1;
    u.columns.value=config.pressColumns??240;u.ink.value=config.pressInk??1;
    u.registerShift.value=config.pressRegister??.65;u.mixAmount.value=config.pressMix??1;
    u.drive.value=(bands[1]*.6+bands[2]*.2+bands[3]*.1)*reaction;
    u.impact.value=onset.impact*reaction;u.angle.value=(config.pressAngle??0)*Math.PI/180;
    u.strength.value=config.intensity;return this.material;
  }
  dispose(){this.material.dispose();}
}
