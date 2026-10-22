import * as THREE from 'three';
import { buildShardCells } from './voronoi-shards.js';

// Voronoi directions, rotation and displacement multipliers adapted from
// Fosfora Raster (MIT, Copyright 2025–2026 Kevin Raymond). Original in vendor/fosfora.
// Textured polygon meshes and stateless audio mapping: MusicFrame Render.
const vertex = `
  attribute vec2 center; attribute vec4 motion;
  uniform float energy,impact,spread,twist,burst,zoom;
  varying vec2 photoUv; varying float shade;
  void main(){
    photoUv=position.xy*.5+.5;
    float amount=(energy*spread*.22+impact*burst*.18)*motion.w;
    float angle=amount*motion.z*twist;
    vec2 offset=position.xy-center;
    float c=cos(angle),s=sin(angle);
    vec2 rotated=vec2(offset.x*c-offset.y*s,offset.x*s+offset.y*c);
    vec2 p=center+rotated+motion.xy*amount*.5;
    gl_Position=vec4(p*zoom,0.,1.);
    shade=1.-abs(sin(angle))*.12;
  }`;
const samplePhoto = `
  uniform sampler2D picture; uniform vec2 ratio;
  vec4 samplePhoto(vec2 uv){
    vec2 p=(uv-.5)*ratio+.5;
    if(any(lessThan(p,vec2(0.)))||any(greaterThan(p,vec2(1.))))return vec4(0.);
    return texture2D(picture,p);
  }`;

export class PhotoShards {
  constructor() {
    this.scene = new THREE.Scene(); this.camera = new THREE.Camera();
    this.uniforms = {
      picture: { value: null }, ratio: { value: new THREE.Vector2(1, 1) }, zoom: { value: 1 },
      energy: { value: 0 }, impact: { value: 0 }, spread: { value: .7 }, twist: { value: .55 }, burst: { value: .8 },
      edges: { value: .15 }, high: { value: 0 }, background: { value: 0 },
    };
    this.material = new THREE.ShaderMaterial({ vertexShader: vertex,
      fragmentShader: `${samplePhoto} varying vec2 photoUv; varying float shade; void main(){vec4 c=samplePhoto(photoUv);if(c.a<.01)discard;gl_FragColor=vec4(c.rgb*c.a*shade,1.);}`,
      uniforms: this.uniforms, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
    });
    this.edgeMaterial = new THREE.ShaderMaterial({ vertexShader: vertex,
      fragmentShader: 'uniform float edges,high;void main(){gl_FragColor=vec4(vec3(.22,.8,1.)*(1.+high*.3),edges);}',
      uniforms: this.uniforms, depthTest: false, depthWrite: false, transparent: true,
    });
    this.backgroundMaterial = new THREE.ShaderMaterial({
      vertexShader: 'varying vec2 photoUv;void main(){photoUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader: `${samplePhoto} uniform float background,zoom;varying vec2 photoUv;void main(){vec4 c=samplePhoto((photoUv-.5)/zoom+.5);gl_FragColor=vec4(c.rgb*c.a*background,1.);}`,
      uniforms: this.uniforms, depthTest: false, depthWrite: false,
    });
    this.backdrop = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.backgroundMaterial);
    this.backdrop.frustumCulled = false; this.backdrop.renderOrder = 0; this.scene.add(this.backdrop);
  }
  prepare(count) {
    if (count === this.count) return;
    if (this.mesh) { this.mesh.geometry.dispose(); this.lines.geometry.dispose(); this.scene.remove(this.mesh, this.lines); }
    const vertices = [], centers = [], motions = [], lineVertices = [], lineCenters = [], lineMotions = [];
    const add = (p, cell, edge) => {
      (edge ? lineVertices : vertices).push(p[0], p[1], 0);
      (edge ? lineCenters : centers).push(...cell.center);
      (edge ? lineMotions : motions).push(...cell.motion);
    };
    for (const cell of buildShardCells(count)) {
      const p = cell.polygon;
      for (let i = 1; i < p.length - 1; i++) for (const v of [p[0], p[i], p[i + 1]]) add(v, cell, false);
      for (let i = 0; i < p.length; i++) { add(p[i], cell, true); add(p[(i + 1) % p.length], cell, true); }
    }
    const geometry = (positions, cellCenters, movement) => {
      const result = new THREE.BufferGeometry();
      result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      result.setAttribute('center', new THREE.Float32BufferAttribute(cellCenters, 2));
      result.setAttribute('motion', new THREE.Float32BufferAttribute(movement, 4));
      return result;
    };
    this.mesh = new THREE.Mesh(geometry(vertices, centers, motions), this.material);
    this.lines = new THREE.LineSegments(geometry(lineVertices, lineCenters, lineMotions), this.edgeMaterial);
    this.mesh.frustumCulled = this.lines.frustumCulled = false;
    this.mesh.renderOrder = 1; this.lines.renderOrder = 2;
    this.scene.add(this.mesh, this.lines); this.count = count;
  }
  draw(renderer, target, texture, config, bands, impact, width, height) {
    this.prepare(config.shardCells ?? 32);
    const u = this.uniforms, aspect = width / height, imageAspect = texture.image.width / texture.image.height;
    u.ratio.value.set(1, 1);
    if (config.fit === 'contain') { if (aspect > imageAspect) u.ratio.value.x = aspect / imageAspect; else u.ratio.value.y = imageAspect / aspect; }
    else { if (aspect > imageAspect) u.ratio.value.y = imageAspect / aspect; else u.ratio.value.x = aspect / imageAspect; }
    u.picture.value = texture; u.energy.value = bands[1] * config.intensity; u.high.value = bands[3] * config.intensity;
    u.impact.value = impact * config.intensity;
    u.zoom.value = 1 + config.zoom * config.intensity * (.035 + bands[1] * .13);
    u.spread.value = config.shardSpread ?? .7; u.twist.value = config.shardTwist ?? .55;
    u.burst.value = config.shardBurst ?? .8; u.edges.value = config.shardEdges ?? .15;
    u.background.value = config.shardBackground ?? 0; this.lines.visible = u.edges.value > 0;
    renderer.setRenderTarget(target); renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.mesh?.geometry.dispose(); this.lines?.geometry.dispose(); this.backdrop.geometry.dispose();
    this.material.dispose(); this.edgeMaterial.dispose(); this.backgroundMaterial.dispose();
  }
}
