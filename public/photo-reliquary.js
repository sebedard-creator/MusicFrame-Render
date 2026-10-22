import * as THREE from 'three';

// Body/escaping-light split, luminance threshold, radial travel, sine fade and
// bass swell adapted from Fosfora reliquary_sim.wgsl, MIT, Kevin Raymond 2025–2026.
// Photo sampling, retained body layer and seekable analytic phase: MusicFrame Render.
export class PhotoReliquary {
  constructor() {
    this.scene = new THREE.Scene(); this.camera = new THREE.Camera();
    this.uniforms = {
      picture: { value: null }, ratio: { value: new THREE.Vector2(1, 1) }, aspect: { value: 16 / 9 },
      zoom: { value: 1 }, phase: { value: 0 }, size: { value: 4 }, pixelScale: { value: 1 },
      shed: { value: .95 }, travel: { value: .4 }, gain: { value: 2 }, body: { value: .8 },
      bass: { value: 0 }, impact: { value: 0 }, high: { value: 0 }, reaction: { value: 1 },
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms, depthTest: false, depthWrite: false,
      transparent: true, blending: THREE.AdditiveBlending,
      vertexShader: `
        uniform sampler2D picture; uniform vec2 ratio;
        uniform float aspect,zoom,phase,size,pixelScale,shed,travel,gain,body,bass,impact,high,reaction;
        attribute float seed,escaping; varying vec3 color; varying float opacity;
        void main(){
          vec2 uv=position.xy*.5*ratio+.5;
          vec4 source=texture2D(picture,clamp(uv,0.,1.));
          float lum=dot(source.rgb,vec3(.299,.587,.114));
          color=vec3(0.);opacity=0.;gl_PointSize=1.;gl_Position=vec4(99.,99.,0.,1.);
          if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.)))||source.a<.01||lum<.025)return;
          vec2 p=position.xy;
          float swell=1.+bass*reaction*.06;
          float radius=size;
          color=source.rgb*2.;opacity=body;
          if(escaping>.5){
            if(shed<=0.||lum<=1.-shed*.4)return;
            float cycle=fract(phase+seed);
            float fade=sin(cycle*3.14159265);
            vec2 screenHome=p*vec2(aspect,1.);
            vec2 direction=length(screenHome)>.0001?normalize(screenHome):vec2(0.,1.);
            p=p*swell+direction/vec2(aspect,1.)*cycle*travel*(.25+bass*reaction*.7+impact*reaction*1.4);
            color*=gain*(1.+high*reaction*.3);
            opacity=fade*.65;radius*=.5+fade*.2;
          }else{p*=swell;radius*=.8+lum*.4;}
          gl_Position=vec4(p*zoom,0.,1.);
          gl_PointSize=clamp(radius*pixelScale,1.,32.);
        }`,
      fragmentShader: `varying vec3 color;varying float opacity;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(color,opacity*(1.-smoothstep(.32,.5,d)));}`,
    });
  }
  prepare(density) {
    if (density === this.density) return;
    if (this.points) { this.points.geometry.dispose(); this.scene.remove(this.points); }
    const height = Math.max(2, Math.round(density * 9 / 16));
    const positions = [], seeds = [], escaping = [];
    for (let layer = 0; layer < 2; layer++) for (let y = 0; y < height; y++) for (let x = 0; x < density; x++) {
      const index = y * density + x;
      const hash = (Math.imul(index + 1, 1664525) + 1013904223) >>> 0;
      positions.push((x + .5) / density * 2 - 1, (y + .5) / height * 2 - 1, 0);
      seeds.push(((Math.imul(hash, 22695477) + 1) >>> 0) / 4294967296); escaping.push(layer);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('seed', new THREE.Float32BufferAttribute(seeds, 1));
    geometry.setAttribute('escaping', new THREE.Float32BufferAttribute(escaping, 1));
    this.points = new THREE.Points(geometry, this.material); this.points.frustumCulled = false;
    this.scene.add(this.points); this.density = density;
  }
  draw(renderer, target, texture, config, bands, impact, phase, width, height) {
    this.prepare(config.relicDensity ?? 240);
    const u = this.uniforms, aspect = width / height, imageAspect = texture.image.width / texture.image.height;
    u.ratio.value.set(1, 1);
    if (config.fit === 'contain') { if (aspect > imageAspect) u.ratio.value.x = aspect / imageAspect; else u.ratio.value.y = imageAspect / aspect; }
    else { if (aspect > imageAspect) u.ratio.value.y = imageAspect / aspect; else u.ratio.value.x = aspect / imageAspect; }
    u.picture.value = texture; u.aspect.value = aspect;
    u.zoom.value = 1 + config.zoom * config.intensity * (.035 + bands[1] * .13);
    u.phase.value = phase; u.pixelScale.value = width / 1920;
    u.size.value = 1920 / (config.relicDensity ?? 240) * (config.relicSize ?? .55);
    u.shed.value = config.relicShed ?? .95; u.travel.value = (config.relicLength ?? .7) * .8 * config.intensity;
    u.gain.value = 1.5 + (config.relicBurst ?? 1) * 1.5; u.body.value = config.relicBody ?? .8;
    u.bass.value = bands[1]; u.high.value = bands[3]; u.impact.value = impact * (config.relicBurst ?? 1);
    u.reaction.value = config.intensity;
    renderer.setRenderTarget(target); renderer.render(this.scene, this.camera);
  }
  dispose() { this.points?.geometry.dispose(); this.material.dispose(); }
}
