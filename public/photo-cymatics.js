import * as THREE from 'three';

// Chladni field, analytical gradient, mode crossfade and nodal size formula
// adapted from Fosfora cymatics_sim.wgsl, MIT, Copyright 2025–2026 Kevin Raymond.
// Photo colours, finite projection and MP3-band mapping: MusicFrame Render.
export class PhotoCymatics {
  constructor() {
    this.scene = new THREE.Scene(); this.camera = new THREE.Camera();
    this.uniforms = {
      picture: { value: null }, ratio: { value: new THREE.Vector2(1, 1) }, zoom: { value: 1 },
      pairA: { value: new THREE.Vector2(3, 2) }, pairB: { value: new THREE.Vector2(4, 1) }, blend: { value: 0 },
      attraction: { value: .7 }, angle: { value: 0 }, energy: { value: 0 }, high: { value: 0 },
      size: { value: 5 }, pixelScale: { value: 1 }, background: { value: .15 },
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
        uniform sampler2D picture; uniform vec2 ratio,pairA,pairB;
        uniform float zoom,blend,attraction,angle,energy,high,size,pixelScale;
        varying vec3 color;
        const float PI=3.14159265;
        vec2 rot(vec2 p,float a){float c=cos(a),s=sin(a);return vec2(p.x*c-p.y*s,p.x*s+p.y*c);}
        float field(vec2 p,vec2 mode){return cos(mode.x*PI*p.x)*cos(mode.y*PI*p.y)-cos(mode.y*PI*p.x)*cos(mode.x*PI*p.y);}
        vec2 gradient(vec2 p,vec2 mode){
          float n=mode.x*PI,m=mode.y*PI;
          return vec2(-n*sin(n*p.x)*cos(m*p.y)+m*sin(m*p.x)*cos(n*p.y),-m*cos(n*p.x)*sin(m*p.y)+n*cos(m*p.x)*sin(n*p.y));
        }
        void main(){
          vec2 uv=(position.xy*.5)*ratio+.5;
          vec4 source=texture2D(picture,clamp(uv,0.,1.));
          float light=dot(source.rgb,vec3(.299,.587,.114));
          if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.)))||source.a<.01||light<.025){gl_Position=vec4(99.,99.,0.,1.);gl_PointSize=1.;color=vec3(0.);return;}
          vec2 q=rot(position.xy,angle);
          for(int i=0;i<6;i++){
            float value=mix(field(q,pairA),field(q,pairB),blend);
            vec2 g=mix(gradient(q,pairA),gradient(q,pairB),blend);
            vec2 stepVector=g*value/max(dot(g,g),.01);
            float distance=length(stepVector);
            if(distance>.12)stepVector*=.12/distance;
            q=clamp(q-stepVector,vec2(-1.),vec2(1.));
          }
          vec2 target=rot(q,-angle);
          vec2 p=mix(position.xy,target,attraction);
          float value=mix(field(rot(p,angle),pairA),field(rot(p,angle),pairB),blend);
          float onLine=exp(-abs(value)*10.);
          gl_Position=vec4(p*zoom,0.,1.);
          gl_PointSize=clamp(size*pixelScale*(.6+.8*onLine)*(1.+energy*.2),1.,32.);
          color=source.rgb*(.75+onLine*.5+high*.15);
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
  draw(renderer, target, texture, config, time, bands, width, height) {
    this.prepare(config.cymDensity ?? 220);
    const pairs = [[2, 1], [3, 2], [4, 1], [5, 2], [4, 3], [5, 1]];
    const mode = config.cymMode ?? 1, u = this.uniforms;
    const aspect = width / height, imageAspect = texture.image.width / texture.image.height;
    u.ratio.value.set(1, 1);
    if (config.fit === 'contain') { if (aspect > imageAspect) u.ratio.value.x = aspect / imageAspect; else u.ratio.value.y = imageAspect / aspect; }
    else { if (aspect > imageAspect) u.ratio.value.y = imageAspect / aspect; else u.ratio.value.x = aspect / imageAspect; }
    u.picture.value = texture;
    u.pairA.value.set(...pairs[mode]); u.pairB.value.set(...pairs[(mode + 1) % pairs.length]);
    u.blend.value = Math.min(.8, bands[2] * .45 + bands[3] * .2) * config.intensity;
    u.attraction.value = Math.min(1, (config.cymAttraction ?? .7) * (.45 + bands[1] * .6)) * config.intensity;
    u.angle.value = time * config.speed * (config.cymRotation ?? .2) * .2;
    u.energy.value = bands[1] * config.intensity; u.high.value = bands[3] * config.intensity;
    u.size.value = 1920 / (config.cymDensity ?? 220) * (config.cymSize ?? .55); u.pixelScale.value = width / 1920;
    u.zoom.value = 1 + config.zoom * config.intensity * (.035 + bands[1] * .13);
    u.background.value = config.cymBackground ?? .15;
    renderer.setRenderTarget(target); renderer.render(this.scene, this.camera);
  }
  dispose() { this.points?.geometry.dispose(); this.backdrop.geometry.dispose(); this.material.dispose(); this.backgroundMaterial.dispose(); }
}
