import * as THREE from 'three';
import { activeGrains } from './grain-schedule.js';

// Spatial crop/scale/rotation and Hann-window compositing adapted from
// Crazy Video Glitch Editor's Granulator, MIT, Copyright 2026 willbearfruits.
// Three.js port and photo/audio mapping: MusicFrame Render.
export class PhotoGranulator {
  constructor() {
    this.scene = new THREE.Scene(); this.camera = new THREE.Camera();
    this.background = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false,
      uniforms: { picture: { value: null }, brightness: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader: 'uniform sampler2D picture; uniform float brightness; varying vec2 vUv; void main(){gl_FragColor=vec4(texture2D(picture,vUv).rgb*brightness,1.);}',
    });
    this.base = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.background);
    this.base.renderOrder = 0; this.scene.add(this.base);
    const plane = new THREE.PlaneGeometry(1, 1);
    this.geometry = new THREE.InstancedBufferGeometry();
    this.geometry.index = plane.index.clone();
    this.geometry.setAttribute('position', plane.attributes.position.clone());
    this.geometry.setAttribute('uv', plane.attributes.uv.clone()); plane.dispose();
    this.attributes = {};
    for (const [key, size] of Object.entries({ crop: 4, placement: 4, motion: 2 })) {
      const attribute = new THREE.InstancedBufferAttribute(new Float32Array(192 * size), size);
      attribute.setUsage(THREE.DynamicDrawUsage);
      this.geometry.setAttribute(key, attribute); this.attributes[key] = attribute;
    }
    this.material = new THREE.ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false,
      uniforms: { picture: { value: null }, aspect: { value: 16 / 9 } },
      vertexShader: `
        attribute vec4 crop; attribute vec4 placement; attribute vec2 motion;
        uniform float aspect; varying vec2 photoUv; varying vec2 patchUv; varying float opacity;
        void main(){
          photoUv=crop.xy+uv*crop.zw; patchUv=uv; opacity=motion.y;
          vec2 p=(uv-.5)*placement.zw;
          p.x*=aspect;
          float c=cos(motion.x),s=sin(motion.x);
          p=mat2(c,-s,s,c)*p; p.x/=aspect;
          gl_Position=vec4((placement.xy+p)*2.-1.,0.,1.);
        }`,
      fragmentShader: `
        uniform sampler2D picture; varying vec2 photoUv; varying vec2 patchUv; varying float opacity;
        void main(){
          vec2 edge=smoothstep(vec2(0.),vec2(.018),patchUv)*smoothstep(vec2(0.),vec2(.018),1.-patchUv);
          gl_FragColor=vec4(texture2D(picture,photoUv).rgb,opacity*edge.x*edge.y);
        }`,
    });
    this.fragments = new THREE.Mesh(this.geometry, this.material);
    this.fragments.frustumCulled = false; this.fragments.renderOrder = 1; this.scene.add(this.fragments);
  }
  draw(renderer, input, output, config, time, bands, width, height) {
    const strength = config.intensity;
    const bass = bands[1] * strength, high = bands[3] * strength;
    const region = config.grainSize ?? .18;
    const grains = activeGrains(time * config.speed * 2, config.grainDensity ?? 55, config.grainDuration ?? .42, region);
    this.geometry.instanceCount = Math.min(grains.length, 192);
    grains.slice(0, 192).forEach((grain, index) => {
      const scatter = (config.grainScatter ?? .55) * (.15 + bass * .85) * strength;
      const scale = grain.scale * (1 + bass * .45);
      const drift = .65 + grain.phase * .7;
      this.attributes.crop.setXYZW(index, grain.x, grain.y, region, region);
      this.attributes.placement.setXYZW(index,
        grain.x + region / 2 + grain.dx * scatter * .32 * drift,
        grain.y + region / 2 + grain.dy * scatter * .32 * drift,
        region * scale, region * scale);
      this.attributes.motion.setXY(index,
        grain.angle * (config.grainRotation ?? .25) * (.3 + high) * Math.PI,
        grain.alpha * Math.min(1, .35 + bass * .7 + high * .15) * strength);
    });
    Object.values(this.attributes).forEach(attribute => { attribute.needsUpdate = true; });
    this.background.uniforms.picture.value = input.texture;
    this.background.uniforms.brightness.value = 1 - (1 - (config.grainBackground ?? .55)) * strength;
    this.material.uniforms.picture.value = input.texture;
    this.material.uniforms.aspect.value = width / height;
    renderer.setRenderTarget(output); renderer.render(this.scene, this.camera);
  }
  dispose() { this.base.geometry.dispose(); this.background.dispose(); this.geometry.dispose(); this.material.dispose(); }
}
