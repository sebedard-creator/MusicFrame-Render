import * as THREE from 'three';

// Target interpolation, cubic easing, stagger, scatter and size pulse adapted
// from Fosfora morph_sim.wgsl (Direct interpolation path); image grid jitter from
// image_source.rs. MIT, Copyright 2025–2026 Kevin Raymond. See vendor/fosfora.
// Browser photo sampling, pairing and stateless MP3 mapping: MusicFrame Render.
export class PhotoMorph {
  constructor() {
    this.scene = new THREE.Scene(); this.camera = new THREE.Camera(); this.cache = new Map();
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        zoom: { value: 1 }, progress: { value: 0 }, stagger: { value: .35 }, scatter: { value: .3 }, energy: { value: 0 },
        treble: { value: 0 }, impact: { value: 0 }, time: { value: 0 }, size: { value: 5 }, pixelScale: { value: 1 },
      },
      vertexShader: `
        attribute vec2 homeA, homeB;
        attribute vec3 colorA, colorB;
        attribute float seed;
        uniform float zoom,progress,stagger,scatter,energy,treble,impact,time,size,pixelScale;
        varying vec3 color;
        float ease(float t){if(t<.5)return 4.*t*t*t;return 1.-pow(-2.*t+2.,3.)*.5;}
        void main(){
          float local=clamp((progress-seed*stagger)/max(.01,1.-stagger),0.,1.);
          float blend=ease(local);
          vec2 p=mix(homeA,homeB,blend);
          vec2 direction=vec2(sin(seed*193.17),cos(seed*217.31));
          float burst=impact*.11+energy*.012+sin(local*3.1415927)*.06;
          p+=direction*vec2(1.,1.7777778)*burst*scatter;
          p+=vec2(sin(seed*41.+time*5.),cos(seed*67.+time*4.))*vec2(1.,1.7777778)*treble*scatter*.002;
          p=(p-.5)*zoom+.5;
          gl_Position=vec4(p.x*2.-1.,1.-p.y*2.,0.,1.);
          gl_PointSize=clamp(size*pixelScale*(1.+energy*.2),1.,48.);
          color=mix(colorA,colorB,blend)*(1.+treble*.16);
        }`,
      fragmentShader: `varying vec3 color;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(color*(1.-smoothstep(.36,.5,d)),1.);}`,
      depthTest: false, depthWrite: false,
    });
  }
  sample(image, config) {
    const density = config.morphDensity ?? 240;
    const threshold = config.morphThreshold ?? .04;
    const key = [image.src, density, config.fit, threshold].join(':');
    if (this.cache.has(key)) return this.cache.get(key);
    const width = density, height = Math.max(2, Math.round(density * 9 / 16));
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const scale = config.fit === 'contain' ? Math.min(width / image.width, height / image.height) : Math.max(width / image.width, height / image.height);
    const w = image.width * scale, h = image.height * scale;
    ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
    const bytes = ctx.getImageData(0, 0, width, height).data;
    const positions = [], colors = [];
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const light = (.299 * bytes[i] + .587 * bytes[i + 1] + .114 * bytes[i + 2]) / 255;
      if (bytes[i + 3] < 10 || light < threshold) continue;
      const index = y * width + x;
      // Local 32-bit deterministic hash replaces the source's 64-bit LCG.
      const a = Math.imul(index + 1, 1664525) + 1013904223 >>> 0;
      const b = Math.imul(a, 1664525) + 1013904223 >>> 0;
      positions.push((x + .5 + (a / 4294967295 * 2 - 1) * .4) / width, (y + .5 + (b / 4294967295 * 2 - 1) * .4) / height);
      colors.push(bytes[i] / 255, bytes[i + 1] / 255, bytes[i + 2] / 255);
    }
    if (!positions.length) { positions.push(.5, .5); colors.push(0, 0, 0); }
    const result = { positions, colors, count: positions.length / 2 };
    this.cache.set(key, result);
    if (this.cache.size > 3) this.cache.delete(this.cache.keys().next().value);
    return result;
  }
  prepare(a, b, config) {
    const key = [a.src, b.src, config.morphDensity, config.morphThreshold, config.fit].join(':');
    if (key === this.key) return;
    const source = this.sample(a, config), dest = this.sample(b, config);
    const count = Math.max(source.count, dest.count);
    const pa = new Float32Array(count * 2), pb = new Float32Array(count * 2);
    const ca = new Float32Array(count * 3), cb = new Float32Array(count * 3), seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const ia = Math.floor(i * source.count / count), ib = Math.floor(i * dest.count / count);
      for (let c = 0; c < 2; c++) { pa[i * 2 + c] = source.positions[ia * 2 + c]; pb[i * 2 + c] = dest.positions[ib * 2 + c]; }
      for (let c = 0; c < 3; c++) { ca[i * 3 + c] = source.colors[ia * 3 + c]; cb[i * 3 + c] = dest.colors[ib * 3 + c]; }
      seeds[i] = ((i * 73 + 179) % 997) / 997;
    }
    if (this.points) { this.points.geometry.dispose(); this.scene.remove(this.points); }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    for (const [name, data, itemSize] of [['homeA', pa, 2], ['homeB', pb, 2], ['colorA', ca, 3], ['colorB', cb, 3], ['seed', seeds, 1]]) geometry.setAttribute(name, new THREE.BufferAttribute(data, itemSize));
    this.points = new THREE.Points(geometry, this.material); this.points.frustumCulled = false;
    this.scene.add(this.points); this.key = key;
  }
  draw(renderer, target, a, b, config, time, bands, impact, width, progress) {
    this.prepare(a, b, config);
    const u = this.material.uniforms;
    u.progress.value = progress;
    u.zoom.value = 1 + config.zoom * config.intensity * (.035 + bands[1] * .13);
    u.stagger.value = config.morphStagger ?? .35;
    u.scatter.value = (config.morphScatter ?? .3) * config.intensity;
    u.energy.value = bands[1] * config.intensity; u.treble.value = bands[3] * config.intensity;
    u.impact.value = impact; u.time.value = time * config.speed;
    u.size.value = 1920 / (config.morphDensity ?? 240) * (config.morphSize ?? .85);
    u.pixelScale.value = width / 1920;
    renderer.setRenderTarget(target); renderer.render(this.scene, this.camera);
  }
  dispose() { this.points?.geometry.dispose(); this.material.dispose(); this.cache.clear(); }
}
