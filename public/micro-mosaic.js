import * as THREE from 'three';

// Edge-gated scatter, density selection and outward gradient displacement
// adapted from gyng/ditherer Pixel Scatter, MIT, Copyright 2026 Ng Guoyou,
// contributors. See vendor/ditherer/pixelScatter.ts and LICENSE.
// GPU tile renderer, central-difference edge estimate and audio mapping: MusicFrame Render.
export class MicroMosaic {
  constructor() {
    this.scene = new THREE.Scene(); this.camera = new THREE.Camera();
    this.background = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false,
      uniforms: { picture: { value: null }, brightness: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader: 'uniform sampler2D picture; uniform float brightness; varying vec2 vUv; void main(){gl_FragColor=vec4(texture2D(picture,vUv).rgb*brightness,1.);}',
    });
    this.base = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.background);
    this.base.renderOrder = 0; this.scene.add(this.base);
    this.material = new THREE.ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false,
      uniforms: { picture: { value: null }, tile: { value: new THREE.Vector2(1, 1) }, spread: { value: .6 },
        density: { value: .75 }, threshold: { value: .05 }, drive: { value: 0 }, pattern: { value: 0 }, mode: { value: 0 },
      },
      vertexShader: `
        attribute vec2 center;
        uniform sampler2D picture; uniform vec2 tile;
        uniform float spread,density,threshold,drive,pattern,mode;
        varying vec2 photoUv; varying vec2 patchUv; varying float opacity;
        float lum(vec2 p){return dot(texture2D(picture,clamp(p,vec2(0.),vec2(1.))).rgb,vec3(.299,.587,.114));}
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        void main(){
          patchUv=uv; photoUv=center+(uv-.5)*tile;
          vec2 stepUv=tile*.7;
          vec2 gradient=vec2(lum(center+vec2(stepUv.x,0.))-lum(center-vec2(stepUv.x,0.)),
                             lum(center+vec2(0.,stepUv.y))-lum(center-vec2(0.,stepUv.y)));
          float edge=length(gradient);
          float seed=hash(center*1920.);
          if(edge<threshold||seed>density||drive<.001){opacity=0.;gl_Position=vec4(2.,2.,2.,1.);return;}
          vec2 direction=gradient/max(edge,.0001);
          if(mode>.5&&mode<1.5)direction=normalize((center-.5)*vec2(16./9.,1.)+vec2(.00001));
          if(mode>1.5)direction=vec2(seed>.5?1.:-1.,0.);
          float jitter=.55+.45*hash(center*731.+pattern);
          vec2 offset=direction*spread*drive*(.2+min(1.,edge*3.))*jitter*70./vec2(1920.,1080.);
          vec2 p=center+(uv-.5)*tile*.9+offset;
          opacity=min(1.,drive*1.4)*(.5+min(1.,edge*2.)*.5);
          gl_Position=vec4(p*2.-1.,0.,1.);
        }`,
      fragmentShader: `uniform sampler2D picture; varying vec2 photoUv; varying vec2 patchUv; varying float opacity;
        void main(){vec2 edge=smoothstep(vec2(0.),vec2(.06),patchUv)*smoothstep(vec2(0.),vec2(.06),1.-patchUv);
          gl_FragColor=vec4(texture2D(picture,clamp(photoUv,vec2(0.),vec2(1.))).rgb,opacity*edge.x*edge.y);}`,
    });
  }
  draw(renderer, input, output, config, time, bands, attack) {
    const size = config.microSize ?? 10;
    if (this.size !== size) {
      this.size = size;
      if (this.mesh) { this.mesh.geometry.dispose(); this.scene.remove(this.mesh); }
      const columns = Math.ceil(1920 / size), rows = Math.ceil(1080 / size);
      const centers = new Float32Array(columns * rows * 2);
      for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
        const i = (y * columns + x) * 2; centers[i] = (x + .5) / columns; centers[i + 1] = (y + .5) / rows;
      }
      const plane = new THREE.PlaneGeometry(1, 1);
      const geometry = new THREE.InstancedBufferGeometry(); geometry.index = plane.index.clone();
      for (const key of ['position', 'uv']) geometry.setAttribute(key, plane.attributes[key].clone()); plane.dispose();
      geometry.setAttribute('center', new THREE.InstancedBufferAttribute(centers, 2)); geometry.instanceCount = columns * rows;
      this.mesh = new THREE.Mesh(geometry, this.material); this.mesh.frustumCulled = false; this.mesh.renderOrder = 1; this.scene.add(this.mesh);
      this.material.uniforms.tile.value.set(1 / columns, 1 / rows);
    }
    this.background.uniforms.picture.value = input.texture;
    this.background.uniforms.brightness.value = 1 - (1 - (config.microBackground ?? .85)) * config.intensity;
    const uniforms = this.material.uniforms;
    uniforms.picture.value = input.texture;
    uniforms.spread.value = config.microSpread ?? .6;
    uniforms.density.value = config.microDensity ?? .75;
    uniforms.threshold.value = config.microThreshold ?? .05;
    uniforms.drive.value = Math.min(1.5, bands[1] * .55 + bands[3] * .35 + attack * 3) * config.intensity;
    uniforms.pattern.value = Math.floor(time * config.speed * 8) % 10000;
    uniforms.mode.value = config.microMode ?? 0;
    renderer.setRenderTarget(output); renderer.render(this.scene, this.camera);
  }
  dispose() { this.mesh?.geometry.dispose(); this.base.geometry.dispose(); this.background.dispose(); this.material.dispose(); }
}
