import * as THREE from 'three';

// Photo sampling, luminance relief and circular point rendering adapted from
// Memory Signal, Copyright (c) 2025 shuhari04, MIT. See vendor/memory-signal/LICENSE.
// Deterministic audio mapping, framing and controls: MusicFrame Render.
export class PhotoRelief {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 16 / 9, 1, 2000);
    this.camera.position.z = 700;
    this.material = new THREE.ShaderMaterial({
      uniforms: { depth: { value: 0 }, energy: { value: 0 }, treble: { value: 0 }, time: { value: 0 }, size: { value: 1 }, pixelScale: { value: 1 } },
      vertexShader: `
        attribute vec3 customColor; attribute float brightness; attribute float seed;
        uniform float depth, energy, treble, time, size, pixelScale;
        varying vec3 color;
        void main(){
          vec3 p=position;
          p.z=(brightness-.3)*depth*(1.+energy*.8);
          p.xy*=1.+energy*.045;
          p.z+=sin(p.x*15.+p.y*12.+time*2.)*energy*12.;
          p.xy+=vec2(sin(seed*61.),cos(seed*79.))*treble*.007;
          vec4 view=modelViewMatrix*vec4(p,1.);
          gl_Position=projectionMatrix*view;
          gl_PointSize=clamp(size*pixelScale*(700./-view.z)*(1.+energy*.65+treble*.25),1.,64.);
          color=customColor*(1.+energy*.18);
        }`,
      fragmentShader: `varying vec3 color; void main(){
        float d=length(gl_PointCoord-.5);
        if(d>.5)discard;
        gl_FragColor=vec4(color*(1.-smoothstep(.32,.5,d)),1.);
      }`,
      depthTest: false, depthWrite: false,
    });
  }
  prepare(image, density) {
    const key = `${image.src}:${density}`;
    if (key === this.key) return;
    this.key = key;
    const ratio = density / Math.max(image.width, image.height);
    const width = Math.max(2, Math.round(image.width * ratio));
    const height = Math.max(2, Math.round(image.height * ratio));
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    const positions = [], colors = [], brightness = [], seeds = [];
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const light = (.299 * pixels[i] + .587 * pixels[i + 1] + .114 * pixels[i + 2]) / 255;
      if (pixels[i + 3] < 20 || light < .025) continue;
      positions.push((x + .5) / width - .5, .5 - (y + .5) / height, 0);
      colors.push(pixels[i] / 255, pixels[i + 1] / 255, pixels[i + 2] / 255);
      brightness.push(light); seeds.push(((x * 73 + y * 179) % 997) / 997);
    }
    if (this.points) { this.points.geometry.dispose(); this.scene.remove(this.points); }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('customColor', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('brightness', new THREE.Float32BufferAttribute(brightness, 1));
    geometry.setAttribute('seed', new THREE.Float32BufferAttribute(seeds, 1));
    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
  }
  draw(renderer, target, image, config, time, bands, width, height) {
    const density = Math.round(config.reliefDensity ?? 220);
    this.prepare(image, density);
    const aspect = width / height, imageAspect = image.width / image.height;
    this.camera.aspect = aspect; this.camera.updateProjectionMatrix();
    const viewHeight = 2 * 700 * Math.tan(Math.PI * 45 / 360);
    const photoHeight = viewHeight * (config.fit === 'contain' ? Math.min(1, aspect / imageAspect) : Math.max(1, aspect / imageAspect));
    // Scale x/y without scaling the luminance depth generated in the shader.
    this.points.scale.set(photoHeight * imageAspect, photoHeight, 1);
    // Model rotation also acts on depth, exposing a tangible photo relief.
    this.points.rotation.y = Math.sin(time * config.speed * .55) * (config.reliefOrbit ?? .55) * .4;
    this.points.rotation.x = Math.cos(time * config.speed * .43) * (config.reliefOrbit ?? .55) * .15;
    const uniforms = this.material.uniforms;
    uniforms.depth.value = (config.reliefDepth ?? .65) * 220;
    uniforms.energy.value = bands[1] * config.intensity;
    uniforms.treble.value = bands[3] * config.intensity;
    uniforms.time.value = time * config.speed;
    uniforms.size.value = (1920 / density) * (config.reliefSize ?? .65);
    uniforms.pixelScale.value = width / 1920;
    this.points.position.z = config.zoom * bands[1] * config.intensity * 35;
    renderer.setRenderTarget(target); renderer.render(this.scene, this.camera);
  }
  dispose() { this.points?.geometry.dispose(); this.material.dispose(); }
}
