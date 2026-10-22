import * as THREE from 'three';
import { holoPose } from './holo-pose.js';

// Original rigid luminance-plane compositor using Three.js instancing (MIT).
export class PhotoHolo {
  constructor(){
    this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(45,16/9,1,2000);this.camera.position.z=700;
    this.target=new THREE.WebGLRenderTarget(1,1,{depthBuffer:true,stencilBuffer:false});
    this.material=new THREE.ShaderMaterial({
      uniforms:{picture:{value:null},photoSize:{value:new THREE.Vector2(1,1)},texel:{value:new THREE.Vector2(1,1)},layers:{value:16},depth:{value:150},stagger:{value:0},presence:{value:.85},lines:{value:.55},tint:{value:.4},scan:{value:.2},phase:{value:0},scanDrive:{value:0},glow:{value:1}},
      vertexShader:`
        attribute float layerId;uniform vec2 photoSize;uniform float layers,depth,stagger;
        varying vec2 photoUv;varying float planeId;
        void main(){
          planeId=layerId;photoUv=uv;
          float slice=layerId<0.?-.56:layerId/max(1.,layers-1.)-.5;
          vec3 p=vec3(position.xy*photoSize,depth*slice);
          p.x+=slice*stagger;
          gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
        }`,
      fragmentShader:`
        uniform sampler2D picture;uniform vec2 texel;uniform float layers,presence,lines,tint,scan,phase,scanDrive,glow;
        varying vec2 photoUv;varying float planeId;
        float luminanceAt(vec2 uv){return dot(texture2D(picture,uv).rgb,vec3(.2126,.7152,.0722));}
        float bin(float light){return floor(clamp(light,0.,.999999)*layers);}
        void main(){
          vec4 photo=texture2D(picture,photoUv);if(photo.a<.02)discard;
          if(planeId<0.){gl_FragColor=vec4(photo.rgb*.12*presence,1.);return;}
          float light=dot(photo.rgb,vec3(.2126,.7152,.0722));
          if(abs(bin(light)-planeId)>.1)discard;
          float neighborX=bin(luminanceAt(photoUv+vec2(texel.x,0.)));
          float neighborY=bin(luminanceAt(photoUv+vec2(0.,texel.y)));
          float edge=max(step(.5,abs(neighborX-planeId)),step(.5,abs(neighborY-planeId)));
          vec3 cyan=vec3(.18,.8,.95),color=mix(photo.rgb,cyan*light,tint)*presence;
          color+=cyan*edge*lines*.5*glow;
          float stripe=1.-smoothstep(.0,.11,abs(fract(photoUv.y*90.-phase*.45)-.5));
          color+=cyan*stripe*scan*scanDrive*.4;
          gl_FragColor=vec4(color,1.);
        }`,side:THREE.DoubleSide,
    });
  }
  prepare(count){
    if(this.count===count)return;
    const plane=new THREE.PlaneGeometry(1,1),geometry=new THREE.InstancedBufferGeometry();
    geometry.index=plane.index.clone();for(const key of ['position','normal','uv'])geometry.setAttribute(key,plane.attributes[key].clone());plane.dispose();
    geometry.setAttribute('layerId',new THREE.InstancedBufferAttribute(Float32Array.from({length:count+1},(_,i)=>i-1),1));geometry.instanceCount=count+1;
    if(this.mesh){this.mesh.geometry.dispose();this.scene.remove(this.mesh);}
    this.mesh=new THREE.Mesh(geometry,this.material);this.mesh.frustumCulled=false;this.scene.add(this.mesh);this.count=count;
  }
  draw(renderer,texture,config,time,bands,impact,width,height){
    const count=config.holoLayers??16;this.prepare(count);
    if(this.target.width!==width||this.target.height!==height)this.target.setSize(width,height);
    const aspect=width/height,imageAspect=texture.image.width/texture.image.height;
    this.camera.aspect=aspect;this.camera.updateProjectionMatrix();
    const viewHeight=2*700*Math.tan(Math.PI*45/360);
    const photoHeight=viewHeight*(config.fit==='contain'?Math.min(1,aspect/imageAspect):Math.max(1,aspect/imageAspect))*.96;
    const pose=holoPose(config,time,bands,impact);this.mesh.rotation.set(pose.rotationX,pose.rotationY,0);this.mesh.position.z=pose.push;
    const u=this.material.uniforms;u.picture.value=texture;u.photoSize.value.set(photoHeight*imageAspect,photoHeight);u.texel.value.set(1/texture.image.width,1/texture.image.height);
    u.layers.value=count;u.depth.value=pose.depth;u.stagger.value=pose.stagger;u.presence.value=config.holoPhoto??.85;u.lines.value=config.holoLines??.55;u.tint.value=config.holoTint??.4;u.scan.value=config.holoScan??.2;u.phase.value=pose.phase;u.scanDrive.value=pose.scanDrive;u.glow.value=pose.glow;
    renderer.setRenderTarget(this.target);renderer.render(this.scene,this.camera);return this.target.texture;
  }
  dispose(){this.mesh?.geometry.dispose();this.material.dispose();this.target.dispose();}
}
