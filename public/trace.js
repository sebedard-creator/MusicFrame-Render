import * as THREE from 'three';

// Luminance-driven photo relief adapted from Memory Signal, MIT,
// Copyright 2025 shuhari04. See vendor/memory-signal/LICENSE.
// Continuous mesh, anti-aliased line shader and audio mapping: MusicFrame Render.
export class PhotoTrace {
  constructor() {
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(45, 16 / 9, 1, 2000);
    this.camera.position.z = 700;
    this.target = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: true, stencilBuffer: false });
    this.tint = new THREE.Color();
    this.material = new THREE.ShaderMaterial({ transparent: true, side: THREE.DoubleSide, depthWrite: false,
      uniforms: { picture: { value: null }, photoSize: { value: new THREE.Vector2(1, 1) }, grid: { value: new THREE.Vector2(80, 50) },
        depth: { value: 110 }, bass: { value: 0 }, mid: { value: 0 }, high: { value: 0 }, time: { value: 0 },
        tint: { value: this.tint }, thickness: { value: 1 }, meshMode: { value: 1 },
      },
      vertexShader: `
        uniform sampler2D picture; uniform vec2 photoSize; uniform float depth,bass,mid,time;
        varying vec2 photoUv;
        void main(){
          photoUv=uv;
          vec3 color=texture2D(picture,uv).rgb;
          float light=dot(color,vec3(.299,.587,.114));
          vec3 p=position; p.xy*=photoSize;
          p.z=(light-.3)*depth*(1.+bass*.8);
          p.z+=sin(uv.x*22.+uv.y*13.+time*2.)*mid*8.;
          gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
        }`,
      fragmentShader: `
        uniform sampler2D picture; uniform vec2 grid; uniform vec3 tint;
        uniform float bass,high,time,thickness,meshMode;
        varying vec2 photoUv;
        void main(){
          vec2 coordinate=photoUv*grid;
          vec2 cell=fract(coordinate);
          vec2 distanceToLine=min(cell,1.-cell)/max(fwidth(coordinate),vec2(.0001));
          float d=meshMode>.5?min(distanceToLine.x,distanceToLine.y):distanceToLine.y;
          float line=1.-smoothstep(thickness*.5,thickness*.5+1.,d);
          float halo=(1.-smoothstep(thickness*.5+1.,thickness*.5+2.,d))*.12;
          vec3 source=texture2D(picture,photoUv).rgb;
          float light=dot(source,vec3(.299,.587,.114));
          float scan=exp(-pow((photoUv.y-(.5+.45*sin(time*.45)))*22.,2.))*high;
          vec3 color=mix(tint,source,.2)*(.2+light*1.3)*(1.+bass*.35);
          color+=vec3(.7,.9,1.)*scan*.6;
          gl_FragColor=vec4(color,max(line,halo));
        }`,
    });
  }
  draw(renderer, image, picture, config, time, bands, width, height) {
    const density = config.traceDensity ?? 88;
    const key = `${image.width}:${image.height}:${density}`;
    if (key !== this.key) {
      this.key = key;
      if (this.mesh) { this.mesh.geometry.dispose(); this.scene.remove(this.mesh); }
      const ratio = density / Math.max(image.width, image.height);
      this.columns = Math.max(4, Math.round(image.width * ratio)); this.rows = Math.max(4, Math.round(image.height * ratio));
      this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, this.columns * 2, this.rows * 2), this.material);
      this.mesh.frustumCulled = false; this.scene.add(this.mesh);
    }
    if (this.target.width !== width || this.target.height !== height) this.target.setSize(width, height);
    const aspect = width / height, imageAspect = image.width / image.height;
    this.camera.aspect = aspect; this.camera.updateProjectionMatrix();
    const viewHeight = 2 * 700 * Math.tan(Math.PI * 45 / 360);
    const photoHeight = viewHeight * (config.fit === 'contain' ? Math.min(1, aspect / imageAspect) : Math.max(1, aspect / imageAspect));
    const tilt = config.traceTilt ?? .55;
    this.mesh.rotation.y = tilt * (.18 + Math.sin(time * config.speed * .4) * .2);
    this.mesh.rotation.x = tilt * (-.12 + Math.cos(time * config.speed * .35) * .06);
    this.mesh.position.z = config.zoom * bands[1] * config.intensity * 25;
    const uniforms = this.material.uniforms;
    uniforms.picture.value = picture; uniforms.photoSize.value.set(photoHeight * imageAspect, photoHeight);
    uniforms.grid.value.set(this.columns, this.rows);
    uniforms.depth.value = (config.traceDepth ?? .65) * 190;
    uniforms.bass.value = bands[1] * config.intensity;
    uniforms.mid.value = bands[2] * config.intensity;
    uniforms.high.value = bands[3] * config.intensity;
    uniforms.time.value = time * config.speed;
    uniforms.thickness.value = (config.traceWidth ?? 1.6) * width / 1920;
    uniforms.meshMode.value = config.traceMesh ?? 1;
    this.tint.setHSL(config.traceHue ?? .49, .8, .62);
    renderer.setRenderTarget(this.target); renderer.render(this.scene, this.camera);
    return this.target.texture;
  }
  dispose() { this.mesh?.geometry.dispose(); this.material.dispose(); this.target.dispose(); }
}
