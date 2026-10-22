import * as THREE from 'three';

// Original MusicFrame Render slit scan. A finite history of audio-driven photo
// poses is sampled analytically; no rendered-frame feedback or image buffer.
export class PhotoChrono {
  constructor(){
    this.values=new Uint8Array(64*4);
    this.history=new THREE.DataTexture(this.values,64,1,THREE.RGBAFormat,THREE.UnsignedByteType);
    this.history.minFilter=THREE.LinearFilter;this.history.magFilter=THREE.LinearFilter;this.history.generateMipmaps=false;
    this.material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      uniforms:{inputTexture:{value:null},history:{value:this.history},columns:{value:640},
        shiftAmount:{value:.75},twist:{value:.6},chroma:{value:.45},reaction:{value:1},strength:{value:1}},
      fragmentShader:`
uniform sampler2D inputTexture,history;
uniform float columns,shiftAmount,twist,chroma,reaction,strength;
varying vec2 vUv;
vec2 photoPose(float age){
 vec4 sound=texture2D(history,vec2(clamp(age,0.,1.),.5))*1.5*reaction;
 float angle=(sound.b-sound.g*.4)*twist*.22;
 float c=cos(angle),s=sin(angle);
 vec2 p=(vUv-.5)*vec2(1.77777778,1.);
 p=mat2(c,-s,s,c)*p/(1.+sound.g*shiftAmount*.3);
 p+=vec2(sound.b-sound.g*.65,sound.a-sound.b*.7)*shiftAmount*.075;
 return clamp(p/vec2(1.77777778,1.)+.5,0.,1.);
}
void main(){
 vec3 original=texture2D(inputTexture,vUv).rgb;
 float age=(floor(vUv.x*columns)+.5)/columns;
 vec3 result=texture2D(inputTexture,photoPose(age)).rgb;
 result.r=texture2D(inputTexture,photoPose(age+chroma*.1)).r;
 result.b=texture2D(inputTexture,photoPose(age-chroma*.1)).b;
 gl_FragColor=vec4(mix(original,result,strength),1.);
}`});
  }
  configure(config,time,sampleFrame){
    const start=Math.floor(time/config.imageSeconds)*config.imageSeconds;
    for(let i=0;i<64;i++){
      const bands=sampleFrame(Math.max(start,time-i/63*(config.chronoDelay??.24)));
      for(let band=0;band<4;band++)this.values[i*4+band]=Math.round(Math.min(1.5,Math.max(0,bands[band]))/1.5*255);
    }
    this.history.needsUpdate=true;
    const u=this.material.uniforms;u.columns.value=config.chronoColumns??640;
    u.shiftAmount.value=config.chronoShift??.75;u.twist.value=config.chronoTwist??.6;
    u.chroma.value=config.chronoChroma??.45;u.reaction.value=config.chronoReaction??1;u.strength.value=config.intensity;
    return this.material;
  }
  dispose(){this.history.dispose();this.material.dispose();}
}
