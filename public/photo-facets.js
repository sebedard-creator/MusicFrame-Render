import * as THREE from 'three';

// Original MusicFrame Render effect. Instanced photo triangles hinged along their
// shared diagonal, using Three.js (MIT), with direct MP3-timed poses.
export class PhotoFacets {
  constructor() {
    this.scene=new THREE.Scene();this.camera=new THREE.Camera();
    this.uniforms={picture:{value:null},ratio:{value:new THREE.Vector2(1,1)},grid:{value:new THREE.Vector2(180,101)},
      zoom:{value:1},phase:{value:0},bass:{value:0},mid:{value:0},high:{value:0},impact:{value:0},
      rotation:{value:.7},relief:{value:.4},lighting:{value:.55},gap:{value:.08},background:{value:.12},exposure:{value:1}};
    this.material=new THREE.ShaderMaterial({uniforms:this.uniforms,side:THREE.DoubleSide,
      vertexShader:`
attribute vec2 center;attribute float face;attribute float seed;
uniform vec2 ratio,grid;uniform float zoom,phase,bass,mid,high,impact,rotation,relief,gap;
varying vec2 photoUv;varying vec3 faceNormal;
vec3 hinge(vec3 p,float a){
 vec3 axis=normalize(vec3(1.,-1.,0.));float c=cos(a),s=sin(a);
 return p*c+cross(axis,p)*s+axis*dot(axis,p)*(1.-c);
}
void main(){
 vec2 local=face>.5?1.-position.xy:position.xy;
 photoUv=((center+(local-.5)/grid)-.5)*ratio+.5;
 vec2 triangleCenter=face>.5?vec2(2./3.):vec2(1./3.);
 vec2 cut=mix(local,triangleCenter,gap);
 float audio=bass*.7+impact*.9;
 float a=sin(seed*31.+phase*1.6)*rotation*audio*(.35+seed*.65)*1.3;
 vec3 p=hinge(vec3((cut-.5)*(2./grid.x),0.),a);
 faceNormal=hinge(vec3(0.,0.,1.),a);
 float lift=(seed-.5)*relief*(2./grid.x)*8.*(bass+impact*.6);
 float z=clamp(p.z+lift,-.35,.35);
 vec2 home=center*2.-1.;
 vec2 projected=home+p.xy*vec2(1.,grid.x/grid.y);
 gl_Position=vec4(projected*zoom,-z,1.-z*.9);
}`,
      fragmentShader:`
uniform sampler2D picture;uniform float lighting,high,impact,exposure;
varying vec2 photoUv;varying vec3 faceNormal;
void main(){
 if(any(lessThan(photoUv,vec2(0.)))||any(greaterThan(photoUv,vec2(1.))))discard;
 vec4 photo=texture2D(picture,photoUv);if(photo.a<.01)discard;
 vec3 n=normalize(faceNormal);if(!gl_FrontFacing)n=-n;
 vec3 light=normalize(vec3(-.35,.4,1.));
 float diffuse=abs(dot(n,light));
 float shine=pow(max(0.,dot(reflect(-light,n),vec3(0.,0.,1.))),24.);
 vec3 color=photo.rgb*mix(1.,.35+diffuse*.85,lighting)*exposure;
 color+=vec3(shine*lighting*(high*.15+impact*.18));
 gl_FragColor=vec4(color,1.);
}`,
    });
    this.backgroundMaterial=new THREE.ShaderMaterial({uniforms:this.uniforms,depthTest:false,depthWrite:false,
      vertexShader:'varying vec2 uvPhoto;void main(){uvPhoto=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader:`uniform sampler2D picture;uniform vec2 ratio;uniform float zoom,background;varying vec2 uvPhoto;
      void main(){vec2 uv=(uvPhoto-.5)*ratio/zoom+.5;vec4 c=texture2D(picture,clamp(uv,0.,1.));
      if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.))))c=vec4(0.);gl_FragColor=vec4(c.rgb*c.a*background,1.);}`});
    this.backdrop=new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.backgroundMaterial);
    this.backdrop.renderOrder=0;this.backdrop.frustumCulled=false;this.scene.add(this.backdrop);
  }
  prepare(columns) {
    if(this.columns===columns)return;
    if(this.mesh){this.mesh.geometry.dispose();this.scene.remove(this.mesh);}
    const rows=Math.round(columns*9/16),count=columns*rows*2;
    const centers=new Float32Array(count*2),faces=new Float32Array(count),seeds=new Float32Array(count);
    for(let y=0,i=0;y<rows;y++)for(let x=0;x<columns;x++)for(let f=0;f<2;f++,i++){
      centers[i*2]=(x+.5)/columns;centers[i*2+1]=(y+.5)/rows;faces[i]=f;
      let hash=i+1;hash=Math.imul(hash^hash>>>16,0x7feb352d);hash=Math.imul(hash^hash>>>15,0x846ca68b);
      seeds[i]=((hash^hash>>>16)>>>0)/4294967296;
    }
    const geometry=new THREE.InstancedBufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,1,0],3));
    geometry.setAttribute('center',new THREE.InstancedBufferAttribute(centers,2));
    geometry.setAttribute('face',new THREE.InstancedBufferAttribute(faces,1));
    geometry.setAttribute('seed',new THREE.InstancedBufferAttribute(seeds,1));geometry.instanceCount=count;
    this.mesh=new THREE.Mesh(geometry,this.material);this.mesh.frustumCulled=false;this.mesh.renderOrder=1;
    this.scene.add(this.mesh);this.uniforms.grid.value.set(columns,rows);this.columns=columns;
  }
  draw(renderer,texture,config,time,bands,onset,width,height) {
    this.prepare(config.facetColumns??180);
    const u=this.uniforms,aspect=width/height,imageAspect=texture.image.width/texture.image.height;
    u.ratio.value.set(1,1);
    if(config.fit==='contain'){if(aspect>imageAspect)u.ratio.value.x=aspect/imageAspect;else u.ratio.value.y=imageAspect/aspect;}
    else {if(aspect>imageAspect)u.ratio.value.y=imageAspect/aspect;else u.ratio.value.x=aspect/imageAspect;}
    const strength=config.intensity*(config.facetReaction??1);
    u.picture.value=texture;u.bass.value=bands[1]*strength;u.mid.value=bands[2]*strength;u.high.value=bands[3]*strength;
    u.impact.value=onset.impact*strength;u.phase.value=time*config.speed;
    u.rotation.value=config.facetRotation??.7;u.relief.value=config.facetRelief??.4;u.lighting.value=config.facetLighting??.55;
    u.gap.value=config.facetGap??.08;u.background.value=config.facetBackground??.12;
    u.zoom.value=1+config.zoom*config.intensity*(.035+bands[1]*.13);u.exposure.value=1+config.intensity*bands[0]*.08;
    if(!this.target)this.target=new THREE.WebGLRenderTarget(width,height,{depthBuffer:true,stencilBuffer:false});
    else if(this.target.width!==width||this.target.height!==height)this.target.setSize(width,height);
    renderer.setRenderTarget(this.target);renderer.render(this.scene,this.camera);
    return this.target.texture;
  }
  dispose(){this.target?.dispose();this.mesh?.geometry.dispose();this.backdrop.geometry.dispose();this.material.dispose();this.backgroundMaterial.dispose();}
}
