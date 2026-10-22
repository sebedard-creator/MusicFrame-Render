import * as THREE from 'three';

// Radial displacement, mid waves, onset scatter and luminance sizing adapted
// from Fosfora raster_sim.wgsl, MIT, Copyright 2025–2026 Kevin Raymond.
// Direct seekable displacement and photo texture sampling: MusicFrame Render.
export class PhotoRaster {
  constructor() {
    this.scene = new THREE.Scene(); this.camera = new THREE.Camera();
    this.uniforms = {
      picture: { value: null }, ratio: { value: new THREE.Vector2(1, 1) }, zoom: { value: 1 },
      size: { value: 4 }, pixelScale: { value: 1 }, background: { value: .1 },
      bass: { value: 0 }, mid: { value: 0 }, high: { value: 0 }, impact: { value: 0 },
      phase: { value: 0 }, pattern: { value: 0 }, radial: { value: .35 }, wave: { value: .1 }, scatter: { value: .6 },
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
        attribute float seed;
        uniform sampler2D picture;uniform vec2 ratio;
        uniform float zoom,size,pixelScale,bass,mid,high,impact,phase,pattern,radial,wave,scatter;
        varying vec3 color;
        void main(){
          vec2 uv=position.xy*.5*ratio+.5;
          vec4 source=texture2D(picture,clamp(uv,0.,1.));
          color=source.rgb;
          if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.)))||source.a<.01){gl_Position=vec4(99.,99.,0.,1.);gl_PointSize=1.;return;}
          float lum=dot(source.rgb,vec3(.299,.587,.114));
          vec2 home=position.xy,dir=normalize(home+vec2(.001));
          vec2 jitter=vec2(sin(seed*317.7+pattern*1.73),cos(seed*211.3+pattern*.91));
          vec2 p=home+dir*min(length(home)*3.,1.)*bass*radial*.10;
          p+=vec2(cos(home.y*4.2+phase*1.6),sin(home.x*6.+phase*2.))*mid*wave*.12;
          p+=jitter*scatter*(impact*.16+high*.004);
          p+=normalize(dir+jitter*.3+vec2(.001))*impact*radial*.07;
          gl_Position=vec4(p*zoom,0.,1.);
          gl_PointSize=clamp(size*pixelScale*(.75+lum*.5)*(1.+bass*.15),1.,32.);
          color*=1.+high*.15+impact*.2;
        }`,
      fragmentShader: 'varying vec3 color;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(color*(1.-smoothstep(.36,.5,d)),1.);}',
      depthTest: false, depthWrite: false,
    });
    this.backgroundMaterial = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: 'varying vec2 photoUv;void main(){photoUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader: `uniform sampler2D picture;uniform vec2 ratio;uniform float zoom,background;varying vec2 photoUv;
        void main(){vec2 uv=(photoUv-.5)*ratio/zoom+.5;vec4 c=texture2D(picture,clamp(uv,0.,1.));
        if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.))))c=vec4(0.);gl_FragColor=vec4(c.rgb*c.a*background,1.);}`,
      depthTest: false, depthWrite: false,
    });
    this.backdrop = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.backgroundMaterial);
    this.backdrop.renderOrder = 0; this.backdrop.frustumCulled = false; this.scene.add(this.backdrop);
  }
  prepare(density) {
    if (density === this.density) return;
    if (this.points) { this.points.geometry.dispose(); this.scene.remove(this.points); }
    const height = Math.max(2, Math.round(density * 9 / 16)), positions = [], seeds = [];
    for (let y = 0; y < height; y++) for (let x = 0; x < density; x++) positions.push((x + .5) / density * 2 - 1, (y + .5) / height * 2 - 1, 0);
    for (let i = 0; i < positions.length / 3; i++) {
      let hash = i + 1;
      hash = Math.imul(hash ^ hash >>> 16, 0x7feb352d);
      hash = Math.imul(hash ^ hash >>> 15, 0x846ca68b);
      seeds.push(((hash ^ hash >>> 16) >>> 0) / 4294967296);
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('seed', new THREE.Float32BufferAttribute(seeds, 1));
    this.points = new THREE.Points(geometry, this.material); this.points.renderOrder = 1; this.points.frustumCulled = false;
    this.scene.add(this.points); this.density = density;
  }
  draw(renderer, target, texture, config, time, bands, transient, width, height) {
    this.prepare(config.rasterDensity ?? 400);
    const u = this.uniforms;
    const aspect = width / height, imageAspect = texture.image.width / texture.image.height;
    u.ratio.value.set(1, 1);
    if (config.fit === 'contain') { if (aspect > imageAspect) u.ratio.value.x = aspect / imageAspect; else u.ratio.value.y = imageAspect / aspect; }
    else { if (aspect > imageAspect) u.ratio.value.y = imageAspect / aspect; else u.ratio.value.x = aspect / imageAspect; }
    u.picture.value = texture;
    u.bass.value = bands[1] * config.intensity; u.mid.value = bands[2] * config.intensity;
    u.high.value = bands[3] * config.intensity; u.impact.value = transient.impact * config.intensity;
    u.pattern.value = transient.pattern % 2048; u.phase.value = time * config.speed;
    u.radial.value = config.rasterRadial ?? .35; u.wave.value = config.rasterWave ?? .1; u.scatter.value = config.rasterScatter ?? .6;
    u.size.value = 1920 / (config.rasterDensity ?? 400) * (config.rasterSize ?? .65); u.pixelScale.value = width / 1920;
    u.zoom.value = 1 + config.zoom * config.intensity * (.035 + bands[1] * .13);
    u.background.value = config.rasterBackground ?? .1;
    renderer.setRenderTarget(target); renderer.render(this.scene, this.camera);
  }
  dispose() { this.points?.geometry.dispose(); this.backdrop.geometry.dispose(); this.material.dispose(); this.backgroundMaterial.dispose(); }
}
