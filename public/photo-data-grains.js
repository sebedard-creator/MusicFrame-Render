import * as THREE from 'three';
import { dataGrainLayout,dataGrainDrive } from './data-grains.js';

// Original photo-colored microfragment swarm. Fixed camera; depth is a layered
// screen-space parallax. Quads, photo samples and trajectories are computed on GPU.
export class PhotoDataGrains {
  constructor(){
    this.scene=new THREE.Scene();this.camera=new THREE.Camera();
    this.uniforms={picture:{value:null},ratio:{value:new THREE.Vector2(1,1)},zoom:{value:1},resolution:{value:new THREE.Vector2(1920,1080)},grid:{value:480},size:{value:.65},flow:{value:.8},depth:{value:.8},trail:{value:.65},tint:{value:.35},background:{value:.035},attack:{value:0},pattern:{value:0},force:{value:0},phase:{value:0},strength:{value:1}};
    this.material=new THREE.ShaderMaterial({uniforms:this.uniforms,depthTest:false,depthWrite:false,transparent:true,blending:THREE.AdditiveBlending,
      vertexShader:`
        attribute vec2 home;attribute float seed;
        uniform sampler2D picture;uniform vec2 ratio,resolution;
        uniform float zoom,grid,size,flow,depth,trail,tint,attack,pattern,force,phase,strength;
        varying vec2 local;varying vec3 photoColor;varying float opacity;
        void main(){
          vec2 source=(home-.5)*ratio/zoom+.5;
          vec4 photo=texture2D(picture,clamp(source,vec2(0.),vec2(1.)));
          local=position.xy;opacity=strength*photo.a;
          if(any(lessThan(source,vec2(0.)))||any(greaterThan(source,vec2(1.))))opacity=0.;
          float layer=fract(seed*31.71),luma=dot(photo.rgb,vec3(.2126,.7152,.0722));
          float motionAmount=min(1.,force);
          vec2 field=vec2(1.,.35*sin(home.x*13.+home.y*6.+phase*.6*motionAmount));
          field.x*=sin(floor(home.y*24.)*2.17+pattern*.4*motionAmount)>.0?1.:-1.;
          vec2 direction=normalize(field);
          float packet=.2+.8*pow(fract(seed*71.13),2.);
          vec2 shift=direction*flow*force*packet*(14.+layer*70.);
          shift+=(home-.5)*depth*attack*(layer-.5)*100.;
          // Independent microfragments accelerate in patches; no feedback frames.
          float width=1920./grid*size*(.6+layer*.8);
          float length=width+trail*attack*packet*(5.+layer*22.);
          vec2 offset=direction*(position.x*length-length*.22)+vec2(-direction.y,direction.x)*position.y*width*.72;
          vec2 p=home+(shift+offset)/vec2(1920.,1080.);
          gl_Position=vec4(p*2.-1.,0.,1.);
          vec3 cyan=vec3(.22,.85,1.);
          photoColor=mix(photo.rgb,cyan*luma,tint*(.4+attack*.3))*(1.8+attack*.55);
          opacity*=.65+layer*.3;
        }`,
      fragmentShader:`varying vec2 local;varying vec3 photoColor;varying float opacity;
        void main(){float core=1.-smoothstep(.23,.5,abs(local.y));float taper=.4+.6*(local.x+.5);gl_FragColor=vec4(photoColor,opacity*core*taper);}`});
    this.backgroundMaterial=new THREE.ShaderMaterial({uniforms:this.uniforms,depthTest:false,depthWrite:false,
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader:`uniform sampler2D picture;uniform vec2 ratio;uniform float zoom,background,strength;varying vec2 vUv;
        void main(){vec2 uv=(vUv-.5)*ratio/zoom+.5;vec4 p=texture2D(picture,clamp(uv,vec2(0.),vec2(1.)));if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.))))p=vec4(0.);gl_FragColor=vec4(p.rgb*p.a*mix(1.,background,strength),1.);}`});
    this.backdrop=new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.backgroundMaterial);this.backdrop.renderOrder=-1;this.backdrop.frustumCulled=false;this.scene.add(this.backdrop);
  }
  prepare(columns){
    if(this.columns===columns)return;
    const layout=dataGrainLayout(columns),plane=new THREE.PlaneGeometry(1,1),geometry=new THREE.InstancedBufferGeometry();
    geometry.setIndex(plane.index.clone());geometry.setAttribute('position',plane.attributes.position.clone());plane.dispose();
    geometry.setAttribute('home',new THREE.InstancedBufferAttribute(layout.homes,2));geometry.setAttribute('seed',new THREE.InstancedBufferAttribute(layout.seeds,1));geometry.instanceCount=layout.count;
    if(this.mesh){this.mesh.geometry.dispose();this.scene.remove(this.mesh);}
    this.mesh=new THREE.Mesh(geometry,this.material);this.mesh.frustumCulled=false;this.mesh.renderOrder=1;this.scene.add(this.mesh);this.columns=columns;
  }
  draw(renderer,target,texture,config,time,bands,track,width,height){
    this.prepare(config.dataDensity??480);const u=this.uniforms,aspect=width/height,imageAspect=texture.image.width/texture.image.height;
    u.ratio.value.set(1,1);if(config.fit==='contain'){if(aspect>imageAspect)u.ratio.value.x=aspect/imageAspect;else u.ratio.value.y=imageAspect/aspect;}else{if(aspect>imageAspect)u.ratio.value.y=imageAspect/aspect;else u.ratio.value.x=aspect/imageAspect;}
    const drive=dataGrainDrive(config,time,bands,track);for(const k of ['attack','pattern','force','phase','strength'])u[k].value=drive[k];
    u.picture.value=texture;u.zoom.value=1+config.zoom*config.intensity*(.035+bands[1]*.13);u.grid.value=config.dataDensity??480;
    u.size.value=config.dataSize??.65;u.flow.value=config.dataFlow??.8;u.depth.value=config.dataDepth??.8;u.trail.value=config.dataTrail??.65;u.tint.value=config.dataTint??.35;u.background.value=config.dataBackground??.035;
    renderer.setRenderTarget(target);renderer.render(this.scene,this.camera);
  }
  dispose(){this.mesh?.geometry.dispose();this.material.dispose();this.backdrop.geometry.dispose();this.backgroundMaterial.dispose();}
}
