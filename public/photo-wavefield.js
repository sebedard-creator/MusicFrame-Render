import * as THREE from 'three';
import { wavefieldHistory } from './wavefield-history.js';

// Original audio-spectrum ribbons with perspective depth, Three.js (MIT).
// Source-photo luminance only affects color, never the shape of the surface.
export class PhotoWavefield {
  constructor(){
    this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(45,16/9,1,2000);this.camera.position.z=700;
    this.target=new THREE.WebGLRenderTarget(1,1,{depthBuffer:true,stencilBuffer:false});
    this.uniforms={picture:{value:null},history:{value:null},photoSize:{value:new THREE.Vector2(1,1)},ratio:{value:new THREE.Vector2(1,1)},rows:{value:128},fill:{value:.6},depth:{value:.75},ripple:{value:.7},phase:{value:0},glow:{value:.5},tint:{value:.15},background:{value:.12},zoom:{value:1}};
    this.material=new THREE.ShaderMaterial({uniforms:this.uniforms,side:THREE.DoubleSide,
      vertexShader:`
        attribute float stripe;uniform sampler2D history;uniform vec2 photoSize,ratio;uniform float rows,fill,depth,ripple,phase,zoom;
        varying vec2 imageUv,ribbonUv;varying float energy;
        void main(){
          ribbonUv=uv;float age=(stripe+.5)/rows;
          vec2 screenUv=vec2(uv.x,1.-age+position.y/rows*fill);
          imageUv=(screenUv-.5)*ratio+.5;
          energy=texture2D(history,vec2(uv.x,age)).r*1.5;
          vec3 p=vec3((screenUv-.5)*photoSize,0.);
          p.z=energy*depth*180.+sin(uv.x*12.+age*7.-phase*2.)*energy*ripple*28.;
          p.xy*=zoom;
          gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
        }`,
      fragmentShader:`
        uniform sampler2D picture;uniform float tint,glow;varying vec2 imageUv,ribbonUv;varying float energy;
        void main(){
          if(any(lessThan(imageUv,vec2(0.)))||any(greaterThan(imageUv,vec2(1.))))discard;
          vec4 photo=texture2D(picture,imageUv);if(photo.a<.02)discard;
          vec3 cyan=vec3(.18,.8,1.);float light=dot(photo.rgb,vec3(.2126,.7152,.0722));
          vec3 color=mix(photo.rgb,cyan*light,tint)*(1.+energy*glow*.22);
          float core=exp(-abs(ribbonUv.y-.5)*8.);
          color+=cyan*core*glow*(.06+energy*.16);
          gl_FragColor=vec4(color,1.);
        }`});
    this.backgroundMaterial=new THREE.ShaderMaterial({uniforms:this.uniforms,depthTest:false,depthWrite:false,
      vertexShader:'varying vec2 photoUv;void main(){photoUv=uv;gl_Position=vec4(position.xy,.99999,1.);}',
      fragmentShader:`uniform sampler2D picture;uniform vec2 ratio;uniform float background;varying vec2 photoUv;
      void main(){vec2 p=(photoUv-.5)*ratio+.5;if(any(lessThan(p,vec2(0.)))||any(greaterThan(p,vec2(1.))))discard;vec4 c=texture2D(picture,p);gl_FragColor=vec4(c.rgb*c.a*background,1.);}`});
    this.backdrop=new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.backgroundMaterial);this.backdrop.renderOrder=-1;this.backdrop.frustumCulled=false;this.scene.add(this.backdrop);
  }
  prepare(rows){
    if(rows===this.rows)return;
    const plane=new THREE.PlaneGeometry(1,1,192,1),geometry=new THREE.InstancedBufferGeometry();geometry.index=plane.index.clone();
    for(const name of ['position','normal','uv'])geometry.setAttribute(name,plane.attributes[name].clone());plane.dispose();
    geometry.setAttribute('stripe',new THREE.InstancedBufferAttribute(Float32Array.from({length:rows},(_,i)=>i),1));geometry.instanceCount=rows;
    if(this.mesh){this.mesh.geometry.dispose();this.scene.remove(this.mesh);}
    this.mesh=new THREE.Mesh(geometry,this.material);this.mesh.frustumCulled=false;this.scene.add(this.mesh);
    this.history?.dispose();this.data=new Uint8Array(64*rows);this.history=new THREE.DataTexture(this.data,64,rows,THREE.RedFormat,THREE.UnsignedByteType);this.history.minFilter=THREE.LinearFilter;this.history.magFilter=THREE.LinearFilter;this.history.generateMipmaps=false;
    this.uniforms.history.value=this.history;this.rows=rows;
  }
  draw(renderer,texture,config,time,bands,analysis,width,height){
    const rows=config.wfRows??128;this.prepare(rows);
    const strength=(config.intensity??1)*(config.wfReaction??1);
    wavefieldHistory(analysis,time,rows,config.wfHistory??1.25,config.sensitivity,strength,this.data);this.history.needsUpdate=true;
    if(this.target.width!==width||this.target.height!==height)this.target.setSize(width,height);
    const aspect=width/height,imageAspect=texture.image.width/texture.image.height,u=this.uniforms;this.camera.aspect=aspect;this.camera.updateProjectionMatrix();
    const viewHeight=2*700*Math.tan(Math.PI*45/360);u.photoSize.value.set(viewHeight*aspect,viewHeight);
    u.ratio.value.set(1,1);if(config.fit==='contain'){if(aspect>imageAspect)u.ratio.value.x=aspect/imageAspect;else u.ratio.value.y=imageAspect/aspect;}else{if(aspect>imageAspect)u.ratio.value.y=imageAspect/aspect;else u.ratio.value.x=aspect/imageAspect;}
    this.mesh.rotation.set(-(config.wfAngle??.65)*.32,(config.wfAngle??.65)*.25,0);
    u.picture.value=texture;u.rows.value=rows;u.fill.value=config.wfFill??.6;u.depth.value=config.wfDepth??.75;u.ripple.value=config.wfRipple??.7;u.phase.value=time*config.speed;u.glow.value=config.wfGlow??.5;u.tint.value=config.wfTint??.15;u.background.value=config.wfBackground??.12;u.zoom.value=1+config.zoom*config.intensity*bands[1]*.06;
    renderer.setRenderTarget(this.target);renderer.render(this.scene,this.camera);return this.target.texture;
  }
  dispose(){this.mesh?.geometry.dispose();this.material.dispose();this.history?.dispose();this.backdrop.geometry.dispose();this.backgroundMaterial.dispose();this.target.dispose();}
}
