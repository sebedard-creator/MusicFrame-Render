import * as THREE from 'three';
import { portalPulse,portalLayout } from './portal-pulse.js';

// Original transient-driven telescoping photo frames, Three.js MIT.
export class PhotoPortal {
  constructor(){
    this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(45,16/9,1,2000);this.camera.position.z=700;
    this.target=new THREE.WebGLRenderTarget(1,1,{depthBuffer:true,stencilBuffer:false});
    this.uniforms={picture:{value:null},photoSize:{value:new THREE.Vector2(1,1)},ratio:{value:new THREE.Vector2(1,1)},impact:{value:0},pattern:{value:0},depth:{value:.9},twist:{value:.5},glow:{value:.5},background:{value:.15},zoom:{value:1}};
    this.material=new THREE.ShaderMaterial({uniforms:this.uniforms,side:THREE.DoubleSide,
      vertexShader:`
        attribute vec2 center,frameSize;attribute float frameLevel;
        uniform vec2 photoSize,ratio;uniform float impact,pattern,depth,twist,zoom;
        varying vec2 imageUv,faceUv;varying vec3 frameNormal;varying float cap;
        void main(){
          vec2 source=center+position.xy*frameSize;imageUv=source*ratio+.5;faceUv=uv;
          float profile=.22+.78*frameLevel;
          float a=sin(frameLevel*5.+pattern*1.7)*twist*impact*.18;
          float c=cos(a),s=sin(a);
          vec3 p=vec3(source*photoSize,position.z*(3.+depth*impact*20.));
          p.xy=mat2(c,s,-s,c)*p.xy*zoom;
          p.z+=impact*depth*240.*profile;
          frameNormal=normalize(normalMatrix*vec3(mat2(c,s,-s,c)*normal.xy,normal.z));cap=abs(normal.z);
          gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
        }`,
      fragmentShader:`
        uniform sampler2D picture;uniform float impact,glow;varying vec2 imageUv,faceUv;varying vec3 frameNormal;varying float cap;
        void main(){
          if(any(lessThan(imageUv,vec2(0.)))||any(greaterThan(imageUv,vec2(1.))))discard;
          vec4 photo=texture2D(picture,imageUv);if(photo.a<.02)discard;
          vec3 cyan=vec3(.15,.8,1.);vec3 color=cap>.5?photo.rgb:mix(photo.rgb*.18,cyan*.25,.7);
          vec2 distanceToEdge=min(faceUv,1.-faceUv)/max(fwidth(faceUv),vec2(.0001));
          float edge=1.-smoothstep(.3,1.6,min(distanceToEdge.x,distanceToEdge.y));
          color+=cyan*edge*glow*(.02+impact*.9);color*=1.+impact*.08;
          gl_FragColor=vec4(color,1.);
        }`});
    this.backgroundMaterial=new THREE.ShaderMaterial({uniforms:this.uniforms,depthTest:false,depthWrite:false,
      vertexShader:'varying vec2 photoUv;void main(){photoUv=uv;gl_Position=vec4(position.xy,.99999,1.);}',
      fragmentShader:`uniform sampler2D picture;uniform vec2 ratio;uniform float background;varying vec2 photoUv;
      void main(){vec2 p=(photoUv-.5)*ratio+.5;if(any(lessThan(p,vec2(0.)))||any(greaterThan(p,vec2(1.))))discard;vec4 c=texture2D(picture,p);gl_FragColor=vec4(c.rgb*c.a*background,1.);}`});
    this.backdrop=new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.backgroundMaterial);this.backdrop.frustumCulled=false;this.backdrop.renderOrder=-1;this.scene.add(this.backdrop);
  }
  prepare(count){
    if(count===this.count)return;
    const layout=portalLayout(count),box=new THREE.BoxGeometry(1,1,1),geometry=new THREE.InstancedBufferGeometry();geometry.index=box.index.clone();
    for(const key of ['position','normal','uv'])geometry.setAttribute(key,box.attributes[key].clone());box.dispose();
    geometry.setAttribute('center',new THREE.InstancedBufferAttribute(layout.centers,2));geometry.setAttribute('frameSize',new THREE.InstancedBufferAttribute(layout.sizes,2));geometry.setAttribute('frameLevel',new THREE.InstancedBufferAttribute(layout.levels,1));geometry.instanceCount=layout.count;
    if(this.mesh){this.mesh.geometry.dispose();this.scene.remove(this.mesh);}
    this.mesh=new THREE.Mesh(geometry,this.material);this.mesh.frustumCulled=false;this.scene.add(this.mesh);this.count=count;
  }
  draw(renderer,texture,config,time,track,width,height){
    this.prepare(config.portalFrames??14);if(this.target.width!==width||this.target.height!==height)this.target.setSize(width,height);
    const pulse=portalPulse(track,time,config),aspect=width/height,imageAspect=texture.image.width/texture.image.height,u=this.uniforms;
    this.camera.aspect=aspect;this.camera.updateProjectionMatrix();const viewHeight=2*700*Math.tan(Math.PI*45/360);u.photoSize.value.set(viewHeight*aspect,viewHeight);
    u.ratio.value.set(1,1);if(config.fit==='contain'){if(aspect>imageAspect)u.ratio.value.x=aspect/imageAspect;else u.ratio.value.y=imageAspect/aspect;}else{if(aspect>imageAspect)u.ratio.value.y=imageAspect/aspect;else u.ratio.value.x=aspect/imageAspect;}
    const tilt=(config.portalTilt??.6)*pulse.impact,sign=pulse.pattern%2?1:-1;this.mesh.rotation.set(tilt*sign*.10,tilt*sign*.23,0);
    u.picture.value=texture;u.impact.value=pulse.impact;u.pattern.value=pulse.pattern;u.depth.value=config.portalDepth??.9;u.twist.value=config.portalTwist??.5;u.glow.value=config.portalGlow??.5;u.background.value=config.portalBackground??.15;u.zoom.value=1+(config.zoom??0)*pulse.impact*.08;
    renderer.setRenderTarget(this.target);renderer.render(this.scene,this.camera);return this.target.texture;
  }
  dispose(){this.mesh?.geometry.dispose();this.material.dispose();this.backdrop.geometry.dispose();this.backgroundMaterial.dispose();this.target.dispose();}
}
