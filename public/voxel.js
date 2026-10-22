import * as THREE from 'three';

// Photo sampling and luminance mapping adapted from Memory Signal (MIT),
// Copyright 2025 shuhari04. See vendor/memory-signal/LICENSE.
// Instanced cube renderer, shading and audio mapping: MusicFrame Render.
export class PhotoVoxels {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 16 / 9, 1, 2000);
    this.camera.position.z = 700;
    this.target = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: true, stencilBuffer: false });
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        photoSize: { value: new THREE.Vector2(1, 1) }, cellSize: { value: new THREE.Vector2(1, 1) },
        fill: { value: .85 }, depth: { value: 120 }, energy: { value: 0 }, treble: { value: 0 }, glow: { value: .3 },
      },
      vertexShader: `
        attribute vec2 center; attribute vec3 cellColor; attribute float brightness;
        uniform vec2 photoSize,cellSize; uniform float fill,depth,energy;
        varying vec3 color; varying vec3 faceNormal; varying vec2 faceUv;
        void main(){
          vec3 p=position;
          p.xy=center*photoSize+p.xy*cellSize*fill*(1.+energy*.025);
          float column=8.+brightness*depth*(1.+energy*.9);
          p.z=(p.z+.5)*column-depth*.3;
          gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
          faceNormal=normalize(normalMatrix*normal); color=cellColor; faceUv=uv;
        }`,
      fragmentShader: `
        uniform float energy,treble,glow;
        varying vec3 color; varying vec3 faceNormal; varying vec2 faceUv;
        void main(){
          float shade=.38+.62*max(0.,dot(normalize(faceNormal),normalize(vec3(-.4,.6,1.))));
          float edge=1.-smoothstep(.0,.045,min(min(faceUv.x,1.-faceUv.x),min(faceUv.y,1.-faceUv.y)));
          vec3 lit=color*shade*(1.+energy*.13);
          lit+=vec3(.13,.65,.8)*edge*glow*(.2+treble*.5);
          gl_FragColor=vec4(lit,1.);
        }`,
    });
  }
  prepare(image, density) {
    const key = `${image.src}:${density}`;
    if (key === this.key) return;
    this.key = key;
    const scale = density / Math.max(image.width, image.height);
    this.columns = Math.max(2, Math.round(image.width * scale));
    this.rows = Math.max(2, Math.round(image.height * scale));
    const canvas = document.createElement('canvas'); canvas.width = this.columns; canvas.height = this.rows;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const centers = [], colors = [], lights = [];
    for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.columns; x++) {
      const i = (y * this.columns + x) * 4;
      const light = (.299 * pixels[i] + .587 * pixels[i + 1] + .114 * pixels[i + 2]) / 255;
      if (pixels[i + 3] < 20 || light < .015) continue;
      centers.push((x + .5) / this.columns - .5, .5 - (y + .5) / this.rows);
      colors.push(pixels[i] / 255, pixels[i + 1] / 255, pixels[i + 2] / 255); lights.push(light);
    }
    if (this.mesh) { this.mesh.geometry.dispose(); this.scene.remove(this.mesh); }
    const cube = new THREE.BoxGeometry(1, 1, 1);
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = cube.index.clone();
    for (const name of ['position', 'normal', 'uv']) geometry.setAttribute(name, cube.attributes[name].clone());
    cube.dispose();
    geometry.setAttribute('center', new THREE.InstancedBufferAttribute(new Float32Array(centers), 2));
    geometry.setAttribute('cellColor', new THREE.InstancedBufferAttribute(new Float32Array(colors), 3));
    geometry.setAttribute('brightness', new THREE.InstancedBufferAttribute(new Float32Array(lights), 1));
    geometry.instanceCount = lights.length;
    this.mesh = new THREE.Mesh(geometry, this.material); this.mesh.frustumCulled = false; this.scene.add(this.mesh);
  }
  draw(renderer, image, config, time, bands, width, height) {
    this.prepare(image, Math.round(config.voxelDensity ?? 84));
    if (this.target.width !== width || this.target.height !== height) this.target.setSize(width, height);
    const aspect = width / height, imageAspect = image.width / image.height;
    this.camera.aspect = aspect; this.camera.updateProjectionMatrix();
    const viewHeight = 2 * 700 * Math.tan(Math.PI * 45 / 360);
    const photoHeight = viewHeight * (config.fit === 'contain' ? Math.min(1, aspect / imageAspect) : Math.max(1, aspect / imageAspect));
    const tilt = config.voxelTilt ?? .6;
    this.mesh.rotation.y = (.23 + Math.sin(time * config.speed * .55) * .24) * tilt;
    this.mesh.rotation.x = -.16 * tilt + Math.cos(time * config.speed * .4) * .08 * tilt;
    this.mesh.position.z = config.zoom * bands[1] * config.intensity * 30;
    const uniforms = this.material.uniforms;
    uniforms.photoSize.value.set(photoHeight * imageAspect, photoHeight);
    uniforms.cellSize.value.set(photoHeight * imageAspect / this.columns, photoHeight / this.rows);
    uniforms.fill.value = config.voxelFill ?? .85;
    uniforms.depth.value = (config.voxelDepth ?? .65) * 180;
    uniforms.energy.value = bands[1] * config.intensity;
    uniforms.treble.value = bands[3] * config.intensity;
    uniforms.glow.value = config.voxelGlow ?? .3;
    renderer.setRenderTarget(this.target); renderer.render(this.scene, this.camera);
    return this.target.texture;
  }
  dispose() { this.mesh?.geometry.dispose(); this.material.dispose(); this.target.dispose(); }
}
