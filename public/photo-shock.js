import * as THREE from 'three';
import { samplePulseWaves } from './audio-shock.js';

// Gaussian rings and squared expansion fade adapted from Fosfora pulse.wgsl.
// MIT, Copyright 2025–2026 Kevin Raymond. See vendor/fosfora.
// Photo grains, displacement and onset scheduling: MusicFrame Render.
export class PhotoShock {
  constructor() {
    this.scene = new THREE.Scene(); this.camera = new THREE.Camera();
    this.uniforms = {
      picture: { value: null }, ratio: { value: new THREE.Vector2(1, 1) }, zoom: { value: 1 },
      size: { value: 4 }, pixelScale: { value: 1 }, background: { value: .1 }, aspect: { value: 16 / 9 },
      radii: { value: new Float32Array(8) }, gains: { value: new Float32Array(8) },
      amplitude: { value: .75 }, width: { value: .07 }, bass: { value: 0 }, high: { value: 0 },
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
        uniform sampler2D picture;uniform vec2 ratio;
        uniform float zoom,size,pixelScale,aspect,radii[8],gains[8],amplitude,width,bass,high;
        varying vec3 color;
        void main(){
          vec2 uv=position.xy*.5*ratio+.5;
          vec4 source=texture2D(picture,clamp(uv,0.,1.));
          color=source.rgb;
          if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.)))||source.a<.01){gl_Position=vec4(99.,99.,0.,1.);gl_PointSize=1.;return;}
          vec2 screen=position.xy*.5*vec2(aspect,1.);
          float r=length(screen),pressure=0.,front=0.;
          for(int i=0;i<8;i++){
            float d=r-radii[i];
            float wave=exp(-(d*d)/(width*width))*gains[i];
            pressure+=wave;front=max(front,wave);
          }
          pressure=min(pressure,2.);
          vec2 dir=r>.0001?screen/r:vec2(0.,1.);
          vec2 p=position.xy+dir/vec2(aspect,1.)*pressure*amplitude*.16;
          float lum=dot(source.rgb,vec3(.299,.587,.114));
          gl_Position=vec4(p*zoom,0.,1.);
          gl_PointSize=clamp(size*pixelScale*(.8+lum*.4)*(1.+front*.25),1.,32.);
          color*=1.+front*amplitude*.45+high*.12;
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
    const height = Math.max(2, Math.round(density * 9 / 16)), positions = [];
    for (let y = 0; y < height; y++) for (let x = 0; x < density; x++) positions.push((x + .5) / density * 2 - 1, (y + .5) / height * 2 - 1, 0);
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.points = new THREE.Points(geometry, this.material); this.points.renderOrder = 1; this.points.frustumCulled = false;
    this.scene.add(this.points); this.density = density;
  }
  draw(renderer, target, texture, config, time, bands, track, width, height) {
    this.prepare(config.shockDensity ?? 400);
    const u = this.uniforms;
    const aspect = width / height, imageAspect = texture.image.width / texture.image.height;
    u.ratio.value.set(1, 1);
    if (config.fit === 'contain') { if (aspect > imageAspect) u.ratio.value.x = aspect / imageAspect; else u.ratio.value.y = imageAspect / aspect; }
    else { if (aspect > imageAspect) u.ratio.value.y = imageAspect / aspect; else u.ratio.value.x = aspect / imageAspect; }
    u.picture.value = texture;
    const waves = samplePulseWaves(track, time, config.shockSpeed ?? 1, config.sensitivity);
    u.radii.value.set(waves.radii); u.gains.value.set(waves.gains.map(value => value * config.intensity));
    u.aspect.value = aspect; u.amplitude.value = config.shockAmplitude ?? .75;
    u.width.value = .015 + (config.shockWidth ?? .35) * .12;
    u.high.value = bands[3] * config.intensity;
    u.size.value = 1920 / (config.shockDensity ?? 400) * (config.shockSize ?? .6); u.pixelScale.value = width / 1920;
    u.zoom.value = 1 + config.zoom * config.intensity * (.035 + bands[1] * .13);
    u.background.value = config.shockBackground ?? .1;
    renderer.setRenderTarget(target); renderer.render(this.scene, this.camera);
  }
  dispose() { this.points?.geometry.dispose(); this.backdrop.geometry.dispose(); this.material.dispose(); this.backgroundMaterial.dispose(); }
}
