import * as THREE from 'three';
import { lamellaDrive } from './lamella-drive.js';

// Original folded image-space lamellae. Lighting suggests relief without a model.
export class PhotoLamella {
  constructor(){
    this.material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,
      uniforms:{inputTexture:{value:null},resolution:{value:new THREE.Vector2(1920,1080)},columns:{value:160},travel:{value:.7},fold:{value:.8},lighting:{value:.65},grain:{value:.45},angle:{value:12},attack:{value:0},pattern:{value:0},force:{value:0},phase:{value:0},strength:{value:1}},
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader:`
        uniform sampler2D inputTexture;uniform vec2 resolution;
        uniform float columns,travel,fold,lighting,grain,angle,attack,pattern,force,phase,strength;
        varying vec2 vUv;
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        vec3 photo(vec2 uv){return texture2D(inputTexture,clamp(uv,vec2(0.),vec2(1.))).rgb;}
        void main(){
          float a=radians(angle);vec2 across=vec2(cos(a),sin(a)),along=vec2(-sin(a),cos(a));
          vec2 pixel=(vUv-.5)*resolution;
          float pitch=1920./columns,x=dot(pixel,across),y=dot(pixel,along);
          float col=floor(x/pitch),local=fract(x/pitch)-.5;
          float wave=sin(col*.21+phase*.7+pattern*.41);
          float tilt=wave*fold*force;
          // Local compression, independent longitudinal slip and luminance parallax.
          vec3 base=photo(vUv);float layer=dot(base,vec3(.2126,.7152,.0722))-.5;
          float slip=(sin(col*.17+phase*.9)+.35*sin(y*.006-col*.11))*travel*force*70.;
          float lateral=(local*pitch*(1./max(.5,cos(tilt)) -1.)+layer*tilt*18.);
          vec2 uv=vUv+(along*slip+across*lateral)/resolution;
          float shade=1.-lighting*abs(tilt)*.38+lighting*tilt*local*.8;
          vec3 color=photo(uv)*shade;
          float edge=1.-smoothstep(0.,max(fwidth(x/pitch)*1.3,.015),.5-abs(local));
          color*=1.-edge*lighting*force*.28;
          color+=vec3(.12,.36,.43)*edge*max(tilt,0.)*lighting*.32;
          vec2 grainCell=floor(vUv*resolution/1.5);
          float n=hash(grainCell);color*=1.+(n-.5)*grain*strength*.35;
          float spark=step(.994,hash(grainCell+pattern))*grain*attack;
          color+=vec3(.3,.7,.8)*spark*.3;
          gl_FragColor=vec4(color,1.);
        }`});
  }
  configure(config,time,bands,track){
    const u=this.material.uniforms,drive=lamellaDrive(config,time,bands,track);
    for(const key of ['attack','pattern','force','phase','strength'])u[key].value=drive[key];
    u.columns.value=config.lamColumns??160;u.travel.value=config.lamTravel??.7;u.fold.value=config.lamFold??.8;u.lighting.value=config.lamLight??.65;u.grain.value=config.lamGrain??.45;u.angle.value=config.lamAngle??12;
    return this.material;
  }
  dispose(){this.material.dispose();}
}
