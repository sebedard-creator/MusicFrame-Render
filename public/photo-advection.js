import * as THREE from 'three';
import { advectionDrive } from './advection-drive.js';

// Original image-space grain advection and subtle parallax, Three.js MIT.
// All displacements are in final 1080p pixels; no 3D model or frame feedback.
export class PhotoAdvection {
  constructor(){
    this.material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,
      uniforms:{inputTexture:{value:null},resolution:{value:new THREE.Vector2(1920,1080)},pitch:{value:2},flow:{value:.9},parallax:{value:.65},trail:{value:.6},grain:{value:.8},chroma:{value:.2},attack:{value:0},pattern:{value:0},force:{value:0},phase:{value:0},strength:{value:1}},
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader:`
        uniform sampler2D inputTexture;uniform vec2 resolution;
        uniform float pitch,flow,parallax,trail,grain,chroma,attack,pattern,force,phase,strength;
        varying vec2 vUv;
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        vec3 photo(vec2 uv){return texture2D(inputTexture,clamp(uv,vec2(0.),vec2(1.))).rgb;}
        float light(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
        void main(){
          vec2 pixel=vUv*resolution,cell=floor(pixel/pitch),within=fract(pixel/pitch);
          float grainAmount=grain*strength;
          vec2 sampleUv=mix(vUv,(cell+.5)*pitch/resolution,grainAmount);
          vec2 p=sampleUv*vec2(1.77777778,1.);
          vec2 current=vec2(sin(p.y*7.+phase*.65)+.5*sin(p.x*11.-p.y*3.-phase*.4),-sin(p.x*7.-phase*.55)+.5*cos(p.y*9.+p.x*4.+phase*.7));
          vec2 displacement=current*flow*force*24.;
          vec3 base=photo(sampleUv);
          vec3 smoothPhoto=(base+photo(sampleUv+vec2(12.,0.)/resolution)+photo(sampleUv-vec2(12.,0.)/resolution)+photo(sampleUv+vec2(0.,12.)/resolution)+photo(sampleUv-vec2(0.,12.)/resolution))/5.;
          float layer=light(smoothPhoto)-.5;
          vec2 depthOffset=vec2(cos(phase*.4+pattern*.7),sin(phase*.35+pattern*.9))*layer*parallax*attack*12.;
          vec2 jitter=vec2(hash(cell+vec2(pattern,13.)),hash(cell+vec2(71.,pattern)))-.5;
          vec2 uv=sampleUv+(displacement+depthOffset+jitter*attack*grainAmount*(pitch+2.))/resolution;
          vec3 color=photo(uv);
          float echo=trail*attack;
          if(echo>.0001)color=color*(1.-echo*.35)+photo(uv-displacement*.17/resolution)*echo*.23+photo(uv-displacement*.34/resolution)*echo*.12;
          float split=chroma*attack;
          if(split>.0001){vec2 offset=normalize(displacement+vec2(.001))*split*4./resolution;color.r=photo(uv+offset).r;color.b=photo(uv-offset).b;}
          float noise=hash(cell*1.17+vec2(9.2,5.7));
          color*=1.+(noise-.5)*grainAmount*.5;
          vec2 edgeDistance=min(within,1.-within)/max(fwidth(pixel/pitch),vec2(.0001));
          float gap=1.-smoothstep(0.,.22,min(edgeDistance.x,edgeDistance.y));
          color*=1.-gap*grainAmount*.18;
          float spark=step(.985,hash(cell+vec2(pattern*3.1,pattern*1.7)))*attack*grainAmount;
          color+=vec3(.3,.65,.75)*spark*.4;
          gl_FragColor=vec4(color,1.);
        }`});
  }
  configure(config,time,bands,track){
    const u=this.material.uniforms,drive=advectionDrive(config,time,bands,track);
    for(const key of ['attack','pattern','force','phase','strength'])u[key].value=drive[key];
    u.pitch.value=config.advPitch??2;u.flow.value=config.advFlow??.9;u.parallax.value=config.advDepth??.65;u.trail.value=config.advTrail??.6;u.grain.value=config.advGrain??.8;u.chroma.value=config.advChroma??.2;
    return this.material;
  }
  dispose(){this.material.dispose();}
}
