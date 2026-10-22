import * as THREE from 'three';
import { plexusGrid } from './plexus-grid.js';

// Connected dots + distance-based alpha inspired by Three.js drawrange example
// (r186, MIT, three.js authors; example by Fernando Serrano).
// Photo sampling, local graph and seekable MP3-driven poses: MusicFrame Render.
const vertex = `
uniform sampler2D picture;
uniform vec2 ratio;
uniform float zoom,size,pixelScale,pitch,bass,mid,high,impact,phase,spread,reach,links;
varying vec3 color;varying float opacity;
#ifdef LINK_PASS
attribute vec2 neighbor;
#endif
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec4 samplePhoto(vec2 p){
 vec2 uv=p*.5*ratio+.5;
 if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.))))return vec4(0.);
 return texture2D(picture,uv);
}
vec2 pose(vec2 home,vec3 photo){
 float seed=hash(home+1.);
 vec2 direction=vec2(sin(seed*127.+phase*1.1),cos(seed*211.-phase*.9));
 vec2 p=home+direction*pitch*spread*(bass*1.8+mid*.6+impact*3.);
 float luminance=dot(photo,vec3(.2126,.7152,.0722));
 float depth=(luminance-.4)*spread*(bass*.1+impact*.08);
 return p*zoom/(1.-depth);
}
void main(){
 vec4 photo=samplePhoto(position.xy);
 color=photo.rgb*(1.+high*.25+impact*.35);
 opacity=photo.a;
 vec2 p=pose(position.xy,photo.rgb);
#ifdef LINK_PASS
 vec4 other=samplePhoto(neighbor);
 vec2 q=pose(neighbor,other.rgb);
 float distance=length((p-q)*vec2(1.,.5625));
 float minDistance=pitch*reach*(1.+bass*.35+impact*.5);
 opacity*=other.a*links*clamp(1.-distance/minDistance,0.,1.);
 color=mix(color,vec3(.25,.8,1.)*dot(color,vec3(.3,.59,.11)),high*.08);
#else
 float light=dot(photo.rgb,vec3(.2126,.7152,.0722));
 gl_PointSize=clamp(size*pixelScale*(.6+light*.6)*(1.+high*.2),1.,32.);
#endif
 gl_Position=vec4(p,0.,1.);
}`;

export class PhotoPlexus {
  constructor() {
    this.scene=new THREE.Scene();this.camera=new THREE.Camera();
    this.uniforms={picture:{value:null},ratio:{value:new THREE.Vector2(1,1)},zoom:{value:1},
      size:{value:4},pixelScale:{value:1},pitch:{value:.01},bass:{value:0},mid:{value:0},high:{value:0},
      impact:{value:0},phase:{value:0},spread:{value:.6},reach:{value:1.6},links:{value:.7},background:{value:.15}};
    const options={uniforms:this.uniforms,vertexShader:vertex,transparent:true,depthTest:false,depthWrite:false};
    this.pointMaterial=new THREE.ShaderMaterial({...options,fragmentShader:`varying vec3 color;varying float opacity;
      void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(color,opacity*(1.-smoothstep(.32,.5,d)));}`});
    this.lineMaterial=new THREE.ShaderMaterial({...options,defines:{LINK_PASS:1},blending:THREE.AdditiveBlending,
      fragmentShader:'varying vec3 color;varying float opacity;void main(){gl_FragColor=vec4(color,opacity);}'});
    this.backgroundMaterial=new THREE.ShaderMaterial({uniforms:this.uniforms,depthTest:false,depthWrite:false,
      vertexShader:'varying vec2 photoUv;void main(){photoUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader:`uniform sampler2D picture;uniform vec2 ratio;uniform float zoom,background;varying vec2 photoUv;
      void main(){vec2 uv=(photoUv-.5)*ratio/zoom+.5;vec4 c=texture2D(picture,clamp(uv,0.,1.));
      if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.))))c=vec4(0.);gl_FragColor=vec4(c.rgb*c.a*background,1.);}`});
    this.backdrop=new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.backgroundMaterial);
    this.backdrop.renderOrder=0;this.backdrop.frustumCulled=false;this.scene.add(this.backdrop);
  }
  prepare(density) {
    if(density===this.density)return;
    for(const mesh of [this.points,this.lines])if(mesh){mesh.geometry.dispose();this.scene.remove(mesh);}
    const graph=plexusGrid(density);
    const points=new THREE.BufferGeometry();points.setAttribute('position',new THREE.BufferAttribute(graph.points,3));
    const lines=new THREE.BufferGeometry();lines.setAttribute('position',new THREE.BufferAttribute(graph.lines,3));
    lines.setAttribute('neighbor',new THREE.BufferAttribute(graph.neighbors,2));
    this.points=new THREE.Points(points,this.pointMaterial);this.lines=new THREE.LineSegments(lines,this.lineMaterial);
    this.lines.renderOrder=1;this.points.renderOrder=2;
    for(const mesh of [this.points,this.lines]){mesh.frustumCulled=false;this.scene.add(mesh);}
    this.density=density;
  }
  draw(renderer,target,texture,config,time,bands,onset,width,height) {
    const density=config.plexDensity??160;this.prepare(density);
    const u=this.uniforms,aspect=width/height,imageAspect=texture.image.width/texture.image.height;
    u.ratio.value.set(1,1);
    if(config.fit==='contain'){if(aspect>imageAspect)u.ratio.value.x=aspect/imageAspect;else u.ratio.value.y=imageAspect/aspect;}
    else {if(aspect>imageAspect)u.ratio.value.y=imageAspect/aspect;else u.ratio.value.x=aspect/imageAspect;}
    const strength=config.intensity;
    u.picture.value=texture;u.bass.value=bands[1]*strength;u.mid.value=bands[2]*strength;u.high.value=bands[3]*strength;
    u.impact.value=onset.impact*strength;u.phase.value=time*config.speed;
    u.spread.value=config.plexSpread??.4;u.reach.value=config.plexReach??2.2;u.links.value=config.plexLinks??.8;
    u.size.value=1920/density*(config.plexSize??.42);u.pixelScale.value=width/1920;u.pitch.value=2/density;
    u.zoom.value=1+config.zoom*strength*(.035+bands[1]*.13);u.background.value=config.plexBackground??.12;
    renderer.setRenderTarget(target);renderer.render(this.scene,this.camera);
  }
  dispose(){this.points?.geometry.dispose();this.lines?.geometry.dispose();this.backdrop.geometry.dispose();
    this.pointMaterial.dispose();this.lineMaterial.dispose();this.backgroundMaterial.dispose();}
}
