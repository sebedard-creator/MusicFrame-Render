import * as THREE from 'three';
import { buildBandIntegral,sampleBandIntegral } from './audio-integral.js';
import { orbitPose } from './orbit-pose.js';
import {responseAnalysis} from './audio-response.js';

// Original photo rotation, driven by integrated audio and causal kick envelopes.
export class PhotoOrbit {
  constructor(){
    this.material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,
      uniforms:{inputTexture:{value:null},resolution:{value:new THREE.Vector2(1920,1080)},angle:{value:0},cover:{value:1},pivot:{value:new THREE.Vector2(.5,.5)},grain:{value:.3}},
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader:`
        uniform sampler2D inputTexture;uniform vec2 resolution,pivot;uniform float angle,cover,grain;varying vec2 vUv;
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        void main(){
          vec2 p=(vUv-pivot)*resolution;float c=cos(angle),s=sin(angle);
          vec2 uv=vec2(c*p.x+s*p.y,-s*p.x+c*p.y)/cover/resolution+pivot;
          vec3 photo=texture2D(inputTexture,clamp(uv,vec2(0.),vec2(1.))).rgb;
          float fine=hash(floor(uv*resolution/1.5));photo*=1.+(fine-.5)*grain*.25;
          gl_FragColor=vec4(photo,1.);
        }`});
  }
  configure(config,time,analysis,track){
    analysis=responseAnalysis(analysis,config.audioResponse);
    if(this.frames!==analysis.frames){this.frames=analysis.frames;this.travel=buildBandIntegral(analysis,0);}
    const pose=orbitPose(config,time,sampleBandIntegral(this.travel,time),track),u=this.material.uniforms;
    u.angle.value=pose.angle;u.cover.value=pose.cover;u.pivot.value.set(pose.centerX,pose.centerY);u.grain.value=pose.grain;
    return this.material;
  }
  dispose(){this.material.dispose();this.frames=null;this.travel=null;}
}
