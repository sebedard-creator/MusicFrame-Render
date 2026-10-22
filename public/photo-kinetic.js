import * as THREE from 'three';
import { kineticLayout,kineticPose } from './kinetic-prisms.js';

// Original MusicFrame Render textured triangular prisms, Three.js (MIT).
// Closed solid geometry, perspective projection, depth testing and MP3-timed flow.
export class PhotoKinetic {
  constructor(){
    this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(45,16/9,1,2000);this.camera.position.z=700;
    this.target=new THREE.WebGLRenderTarget(1,1,{depthBuffer:true,stencilBuffer:false});
    this.uniforms={picture:{value:null},ratio:{value:new THREE.Vector2(1,1)},photoSize:{value:new THREE.Vector2(1,1)},grid:{value:new THREE.Vector2(48,27)},bass:{value:0},mid:{value:0},high:{value:0},impact:{value:0},phase:{value:0},zoom:{value:1},depth:{value:.8},spread:{value:.7},spin:{value:.7},flow:{value:.8},glow:{value:.4},background:{value:.1}};
    this.material=new THREE.ShaderMaterial({uniforms:this.uniforms,side:THREE.DoubleSide,
      vertexShader:`
        attribute vec2 cell;attribute float face,seed;
        uniform vec2 ratio,photoSize,grid;uniform float bass,mid,high,impact,phase,zoom,depth,spread,spin,flow;
        varying vec2 photoUv;varying vec3 prismNormal;varying vec3 barycentric;varying float cap;
        vec3 rotatePrism(vec3 p,vec3 a){
          float c=cos(a.x),s=sin(a.x);p.yz=mat2(c,s,-s,c)*p.yz;
          c=cos(a.y);s=sin(a.y);p.xz=mat2(c,-s,s,c)*p.xz;
          c=cos(a.z);s=sin(a.z);p.xy=mat2(c,s,-s,c)*p.xy;return p;
        }
        void main(){
          vec2 local=face>.5?1.-position.xy:position.xy;
          vec2 pivot=face>.5?vec2(2./3.):vec2(1./3.);
          vec2 homeUv=(cell+pivot)/grid;
          photoUv=((cell+local)/grid-.5)*ratio+.5;
          vec2 cellSize=photoSize/grid;
          float cellWidth=min(cellSize.x,cellSize.y);
          float drive=min(1.5,bass*.6+mid*.25+impact*.75);
          vec3 angle=vec3(sin(seed*21.+phase*1.3),cos(seed*17.-phase*.9),sin(seed*37.+phase*.7))*vec3(.9,1.45,.5)*spin*drive;
          vec3 p=vec3((local-pivot)*cellSize*.94,(position.z-.5)*cellWidth*(.08+depth*1.2));
          vec3 home=vec3((homeUv-.5)*photoSize,0.);
          vec2 circulate=vec2(sin(homeUv.y*9.+phase*.9+seed*2.),cos(homeUv.x*7.-phase*.75+seed*2.));
          vec2 radial=normalize(homeUv-.5+vec2(.001));
          home.xy+=mix(radial,circulate,flow)*spread*cellWidth*3.*min(1.5,bass*.3+mid*.7+impact*.45);
          home.z+=sin(seed*13.+phase*1.3)*depth*180.*drive;
          p=home+rotatePrism(p,angle);p.xy*=zoom;
          vec3 n=normal;if(face>.5)n.xy=-n.xy;
          prismNormal=normalize(normalMatrix*rotatePrism(n,angle));
          cap=abs(normal.z);barycentric=vec3(1.-position.x-position.y,position.x,position.y);
          gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
        }`,
      fragmentShader:`
        uniform sampler2D picture;uniform float high,impact,glow;
        varying vec2 photoUv;varying vec3 prismNormal;varying vec3 barycentric;varying float cap;
        void main(){
          if(any(lessThan(photoUv,vec2(0.)))||any(greaterThan(photoUv,vec2(1.))))discard;
          vec4 photo=texture2D(picture,photoUv);if(photo.a<.02)discard;
          vec3 n=normalize(prismNormal);if(!gl_FrontFacing)n=-n;
          float diffuse=.42+.58*abs(dot(n,normalize(vec3(-.35,.6,1.))));
          vec3 cyan=vec3(.12,.72,.9);
          vec3 color=cap>.5?photo.rgb*(.55+.45*diffuse):mix(photo.rgb*.2,cyan*.32,.7)*diffuse;
          float distanceToEdge=min(barycentric.x,min(barycentric.y,barycentric.z));
          float edge=1.-smoothstep(0.,max(.001,fwidth(distanceToEdge)*1.4),distanceToEdge);
          color+=cyan*edge*glow*(.28+high*.35+impact*.3);
          gl_FragColor=vec4(color,1.);
        }`});
    this.backgroundMaterial=new THREE.ShaderMaterial({uniforms:this.uniforms,depthTest:false,depthWrite:false,
      vertexShader:'varying vec2 photoUv;void main(){photoUv=uv;gl_Position=vec4(position.xy,.99999,1.);}',
      fragmentShader:`uniform sampler2D picture;uniform vec2 ratio;uniform float background;varying vec2 photoUv;
      void main(){vec2 p=(photoUv-.5)*ratio+.5;if(any(lessThan(p,vec2(0.)))||any(greaterThan(p,vec2(1.))))discard;vec4 c=texture2D(picture,p);gl_FragColor=vec4(c.rgb*c.a*background,1.);}`});
    this.backdrop=new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.backgroundMaterial);this.backdrop.renderOrder=-1;this.backdrop.frustumCulled=false;this.scene.add(this.backdrop);
  }
  prepare(columns){
    if(columns===this.columns)return;
    const layout=kineticLayout(columns),shape=new THREE.Shape();shape.moveTo(0,0);shape.lineTo(1,0);shape.lineTo(0,1);shape.closePath();
    const prism=new THREE.ExtrudeGeometry(shape,{depth:1,bevelEnabled:false,steps:1}),geometry=new THREE.InstancedBufferGeometry();
    for(const name of ['position','normal','uv'])geometry.setAttribute(name,prism.attributes[name].clone());prism.dispose();
    geometry.setAttribute('cell',new THREE.InstancedBufferAttribute(layout.cells,2));geometry.setAttribute('face',new THREE.InstancedBufferAttribute(layout.faces,1));geometry.setAttribute('seed',new THREE.InstancedBufferAttribute(layout.seeds,1));geometry.instanceCount=layout.count;
    if(this.mesh){this.mesh.geometry.dispose();this.scene.remove(this.mesh);}
    this.mesh=new THREE.Mesh(geometry,this.material);this.mesh.frustumCulled=false;this.scene.add(this.mesh);this.columns=columns;this.uniforms.grid.value.set(columns,layout.rows);
  }
  draw(renderer,texture,config,time,bands,impact,width,height){
    this.prepare(config.kinColumns??48);if(this.target.width!==width||this.target.height!==height)this.target.setSize(width,height);
    const aspect=width/height,imageAspect=texture.image.width/texture.image.height,u=this.uniforms;
    this.camera.aspect=aspect;this.camera.updateProjectionMatrix();
    const viewHeight=2*700*Math.tan(Math.PI*45/360);u.photoSize.value.set(viewHeight*aspect,viewHeight);
    u.ratio.value.set(1,1);if(config.fit==='contain'){if(aspect>imageAspect)u.ratio.value.x=aspect/imageAspect;else u.ratio.value.y=imageAspect/aspect;}else{if(aspect>imageAspect)u.ratio.value.y=imageAspect/aspect;else u.ratio.value.x=aspect/imageAspect;}
    const pose=kineticPose(config,time,bands,impact);for(const key of ['bass','mid','high','impact','phase','zoom'])u[key].value=pose[key];
    u.picture.value=texture;u.depth.value=config.kinDepth??.8;u.spread.value=config.kinSpread??.7;u.spin.value=config.kinSpin??.7;u.flow.value=config.kinFlow??.8;u.glow.value=config.kinGlow??.4;u.background.value=config.kinBackground??.1;
    renderer.setRenderTarget(this.target);renderer.render(this.scene,this.camera);return this.target.texture;
  }
  dispose(){this.mesh?.geometry.dispose();this.material.dispose();this.backdrop.geometry.dispose();this.backgroundMaterial.dispose();this.target.dispose();}
}
