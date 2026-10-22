import * as THREE from 'three';
import { feedbackPlan } from './feedback-clock.js';

// Butterchurn 2.6.7 (MIT) runs its real warp/feedback/composition pipeline.
// Photo preset, direct MP3 envelopes and fixed simulation clock: MusicFrame Render.
let library;
function loadButterchurn() {
  if (!library) library = new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = '/lib/butterchurn/butterchurn.min.js';
    script.onload = () => resolve(window.butterchurn.default || window.butterchurn);
    script.onerror = () => { library = null; reject(new Error('Butterchurn introuvable.')); };
    document.head.append(script);
  });
  return library;
}

export class PhotoFeedback {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.NoColorSpace; this.texture.generateMipmaps = false;
    this.texture.minFilter = THREE.LinearFilter; this.texture.magFilter = THREE.LinearFilter;
    this.tick = -1; this.frame = {};
    const silence = new Uint8Array(1024).fill(128);
    this.silence = { timeByteArray: silence, timeByteArrayL: silence, timeByteArrayR: silence };
  }
  async initialize(width, height) {
    const butterchurn = await loadButterchurn();
    this.canvas.width = width; this.canvas.height = height;
    this.visualizer = butterchurn.createVisualizer(null, this.canvas, { width, height, pixelRatio: 1, textureRatio: 1, meshWidth: 16, meshHeight: 12, outputFXAA: false });
    this.visualizer.loadPreset({
      baseVals: { decay: 1, gammaadj: 1, wave_a: 0, ob_a: 0, ib_a: 0, mv_a: 0, warp: 0, zoom: 1, rot: 0, echo_alpha: 0 },
      shapes: [], waves: [], pixel_eqs: '',
      init_eqs: a => a,
      frame_eqs: a => {
        const f = this.frame;
        for (let i = 1; i <= 16; i++) a[`q${i}`] = f[i] || 0;
        return a;
      },
      warp: this.warpShader ?? `uniform sampler2D sampler_photo;
shader_body {
  vec2 p = uv_orig;
  float rows = max(12.0, q7 / 1.7777778);
  float row = floor(p.y * rows);
  float gate = fract(sin(row * 71.17 + q15 * 31.3) * 43758.5453);
  float shift = (gate - .5) * q6 * (q1 * .035 + q4 * .075);
  vec2 historyUv = .5 + (uv - .5) * (1.0 - q6 * q1 * .018);
  historyUv.x += shift;
  historyUv.y += sin(p.x * 28.0 + q14 * 2.0) * q2 * q6 * .003;
  vec2 photoUv = p;
  photoUv.x += shift * .4;
  photoUv = (floor(photoUv * vec2(q7, rows)) + .5) / vec2(q7, rows);
  photoUv = (photoUv - .5) * vec2(q10, q11) / q12 + .5;
  vec3 photo = texture(sampler_photo, photoUv).rgb;
  if (photoUv.x < 0.0 || photoUv.y < 0.0 || photoUv.x > 1.0 || photoUv.y > 1.0) photo = vec3(0.0);
  vec2 fringe = vec2(q8 * (q3 * .004 + q4 * .008), 0.0);
  vec3 history = vec3(texture(sampler_main, historyUv + fringe).r,
    texture(sampler_main, historyUv).g, texture(sampler_main, historyUv - fringe).b);
  float memory = q5 * clamp(q1 * .55 + q2 * .2 + q4 * .5, 0.0, 1.0);
  float inject = clamp(q9 + q4 * .3, .12, 1.0);
  ret = mix(photo, mix(photo * inject, history, memory), q13);
}
`,
      comp: 'shader_body { ret = texture(sampler_main, uv).rgb; }',
    }, 0);
    // Pinned 2.6.7 adapter: direct texture upload avoids async image-load races.
    const r = this.visualizer.renderer;
    this.photoTexture = r.gl.createTexture(); r.image.samplers.photo = this.photoTexture;
  }
  clear() {
    const r = this.visualizer.renderer, gl = r.gl;
    for (const buffer of [r.prevFrameBuffer, r.targetFrameBuffer, r.compFrameBuffer]) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, buffer); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  async draw(image, config, time, sampleFrame, width, height) {
    if (!this.visualizer) await this.initialize(width, height);
    let reset = false;
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width; this.canvas.height = height;
      this.visualizer.setRendererSize(width, height, { pixelRatio: 1, textureRatio: 1 }); reset = true;
    }
    const key = JSON.stringify(config);
    if (this.image !== image) {
      this.image = image;
      this.visualizer.renderer.image.bindTexture(this.photoTexture, image, image.width, image.height);
      reset = true;
    }
    if (key !== this.key) { this.key = key; reset = true; }
    const plan = feedbackPlan(time, this.tick, reset, Math.floor(time / config.imageSeconds) * config.imageSeconds);
    if (plan.restart) this.clear();
    const aspect = width / height, photoAspect = image.width / image.height;
    const ratio = config.fit === 'contain' ? (aspect > photoAspect ? [aspect / photoAspect, 1] : [1, photoAspect / aspect]) : (aspect > photoAspect ? [1, photoAspect / aspect] : [aspect / photoAspect, 1]);
    for (const tick of plan.ticks) {
      const t = tick / 60, f = sampleFrame(t), s = config.intensity;
      this.frame = { 1: f.bass, 2: f.mid, 3: f.high, 4: f.impact,
        5: plan.restart && tick === plan.ticks[0] ? 0 : (config.feedbackMemory ?? .76), 6: (config.feedbackShift ?? .65) * s,
        7: config.feedbackColumns ?? 320, 8: (config.feedbackChroma ?? .45) * s,
        9: config.feedbackPhoto ?? .8, 10: ratio[0], 11: ratio[1],
        12: 1 + config.zoom * s * f.bass * .12, 13: s,
        14: t * config.speed, 15: f.pattern, 16: config.weaveFill ?? 0 };
      this.visualizer.render({ elapsedTime: 1 / 60, audioLevels: this.silence });
    }
    // WebGL's default canvas buffer is transient; paused redraws reuse the
    // retained feedback texture without advancing its simulation.
    if (!plan.ticks.length) this.visualizer.renderer.renderToScreen();
    this.tick = plan.tick; this.texture.needsUpdate = true;
    return this.texture;
  }
  dispose() {
    this.texture.dispose();
    this.visualizer?.renderer.gl.getExtension('WEBGL_lose_context')?.loseContext();
    this.visualizer = null;
  }
}
