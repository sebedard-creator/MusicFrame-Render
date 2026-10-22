import * as THREE from 'three';
import { sculptHeightfield, sculptPose } from './sculpt-heightfield.js';

// Original photo bas-relief and audio mapping built with Three.js (MIT).
// Three.js copyright/license is retained in node_modules/three/LICENSE and notices.
export class PhotoSculpt {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 16/9, 1, 2000);
    this.camera.position.z = 700;
    this.target = new THREE.WebGLRenderTarget(1,1,{depthBuffer:true,stencilBuffer:false});
    this.material = new THREE.ShaderMaterial({
      uniforms: { picture:{value:null}, photoSize:{value:new THREE.Vector2(1,1)}, depth:{value:0}, wave:{value:0}, phase:{value:0}, lighting:{value:.6}, lightDirection:{value:new THREE.Vector3(-.4,.65,1)}, faceting:{value:0} },
      vertexShader: `
        attribute float elevation; attribute vec2 slope;
        uniform vec2 photoSize; uniform float depth,wave,phase;
        varying vec2 photoUv; varying vec3 surfaceNormal; varying vec3 surfacePosition;
        void main(){
          photoUv=uv;
          vec3 p=position; p.xy*=photoSize;
          float ax=uv.x*7.+phase*2.,ay=uv.y*5.-phase*1.4;
          p.z=(elevation-.42)*depth+sin(ax)*cos(ay)*wave;
          float dx=slope.x*depth+7.*cos(ax)*cos(ay)*wave;
          float dy=slope.y*depth-5.*sin(ax)*sin(ay)*wave;
          surfaceNormal=normalize(normalMatrix*vec3(-dx/photoSize.x,-dy/photoSize.y,1.));
          vec4 view=modelViewMatrix*vec4(p,1.);surfacePosition=view.xyz;
          gl_Position=projectionMatrix*view;
        }`,
      fragmentShader: `
        uniform sampler2D picture;uniform float lighting,faceting;uniform vec3 lightDirection;
        varying vec2 photoUv;varying vec3 surfaceNormal;varying vec3 surfacePosition;
        void main(){
          vec4 photo=texture2D(picture,photoUv);if(photo.a<.02)discard;
          vec3 smoothNormal=normalize(surfaceNormal);
          vec3 facetNormal=normalize(cross(dFdx(surfacePosition),dFdy(surfacePosition)));
          if(dot(facetNormal,smoothNormal)<0.)facetNormal=-facetNormal;
          vec3 n=normalize(mix(smoothNormal,facetNormal,faceting));
          vec3 light=normalize(lightDirection),eye=normalize(-surfacePosition);
          float diffuse=max(0.,dot(n,light));
          float shine=pow(max(0.,dot(n,normalize(light+eye))),36.);
          float rim=pow(1.-max(0.,dot(n,eye)),3.);
          vec3 color=photo.rgb*mix(1.,.52+diffuse*.58,lighting);
          color+=vec3(.45,.7,.8)*shine*lighting*.16+vec3(.12,.3,.4)*rim*lighting*.18;
          gl_FragColor=vec4(color,1.);
        }`,
      side: THREE.DoubleSide,
    });
  }
  prepare(image, config) {
    const density=Math.round(config.sculptDensity??200),smoothing=config.sculptSmooth??.45;
    const key=`${image.src}:${density}:${smoothing}`;if(key===this.key)return;
    const ratio=density/Math.max(image.width,image.height);
    const width=Math.max(2,Math.round(image.width*ratio)),height=Math.max(2,Math.round(image.height*ratio));
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0,width,height);
    const field=sculptHeightfield(context.getImageData(0,0,width,height).data,width,height,smoothing);
    const geometry=new THREE.PlaneGeometry(1,1,width-1,height-1);
    geometry.setAttribute('elevation',new THREE.BufferAttribute(field.values,1));
    geometry.setAttribute('slope',new THREE.BufferAttribute(field.slopes,2));
    if(this.mesh){this.mesh.geometry.dispose();this.scene.remove(this.mesh);}
    this.mesh=new THREE.Mesh(geometry,this.material);this.mesh.frustumCulled=false;this.scene.add(this.mesh);this.key=key;
  }
  draw(renderer, texture, config, time, bands, impact, width, height) {
    this.prepare(texture.image,config);
    if(this.target.width!==width||this.target.height!==height)this.target.setSize(width,height);
    const aspect=width/height,imageAspect=texture.image.width/texture.image.height;
    this.camera.aspect=aspect;this.camera.updateProjectionMatrix();
    const viewHeight=2*700*Math.tan(Math.PI*45/360);
    const photoHeight=viewHeight*(config.fit==='contain'?Math.min(1,aspect/imageAspect):Math.max(1,aspect/imageAspect));
    const pose=sculptPose(config,time,bands,impact);
    this.mesh.rotation.set(pose.rotationX,pose.rotationY,0);this.mesh.position.z=pose.push;
    const u=this.material.uniforms;u.picture.value=texture;u.photoSize.value.set(photoHeight*imageAspect,photoHeight);
    u.depth.value=pose.depth;u.wave.value=pose.wave;u.phase.value=pose.phase;u.lighting.value=config.sculptLight??.65;u.faceting.value=config.sculptFacets??.15;
    u.lightDirection.value.set(pose.lightX,pose.lightY,1);
    renderer.setRenderTarget(this.target);renderer.render(this.scene,this.camera);return this.target.texture;
  }
  dispose(){this.mesh?.geometry.dispose();this.material.dispose();this.target.dispose();}
}
