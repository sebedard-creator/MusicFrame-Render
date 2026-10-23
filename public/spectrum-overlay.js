import * as THREE from 'three';
import { fragmentShader } from './vendor/fft-visualizer/spectrum-shader.js';
import { gradientPresets, buildGradientLUT } from './vendor/fft-visualizer/gradients.js';
import { decodeStereoSpectrum, processStereoTrack, sampleStereoTrack, LightweightStereoSampler } from './stereo-spectrum.js';

const gradients = ['mono', 'aurora', 'classic', 'rainbow', 'blue', 'prism', 'sunset'];
const displayMaxHz = 16000;
function spectrumTexture(data) {
  const texture = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  texture.minFilter = texture.magFilter = THREE.NearestFilter; texture.unpackAlignment = 1; texture.needsUpdate = true;
  return texture;
}
export class SpectrumOverlay {
  constructor() {
    this.scene = new THREE.Scene(); this.camera = new THREE.Camera();
    this.textures = Array.from({ length: 4 }, () => spectrumTexture(new Uint8Array(80)));
    this.gradient = new THREE.DataTexture(new Uint8Array(256 * 4), 256, 1, THREE.RGBAFormat);
    this.gradient.minFilter = this.gradient.magFilter = THREE.LinearFilter;
    const uniforms = {
      u_resolution: { value: new THREE.Vector2() }, u_origin: { value: new THREE.Vector2() }, u_opacity: { value: 1 },
      u_dpr: { value: 1 }, u_bgColor: { value: new THREE.Vector3() }, u_bgAlpha: { value: 0 }, u_bins: { value: 80 },
      u_showPeaks: { value: false }, u_ledBars: { value: false }, u_ledMeter: { value: false }, u_lumiBars: { value: false },
      u_gradientHorizontal: { value: true }, u_barLevelColor: { value: false }, u_stereo: { value: true },
      u_radial: { value: false }, u_radialInner: { value: .35 }, u_barSpace: { value: .4 }, u_reflexRatio: { value: 0 },
      u_reflexAlpha: { value: .25 }, u_glow: { value: 1 }, u_rotation: { value: 0 },
      u_fftData: { value: this.textures[0] }, u_peakData: { value: this.textures[1] },
      u_fftDataRight: { value: this.textures[2] }, u_peakDataRight: { value: this.textures[3] }, u_gradientTex: { value: this.gradient },
    };
    // Original MIT renderer, adapted only for a positioned viewport and opacity.
    const shader = 'uniform vec2 u_origin; uniform float u_opacity;\n' + fragmentShader
      .replace('void main() {', 'void upstreamMain() {')
      .replace('gl_FragCoord.xy / u_resolution', '(gl_FragCoord.xy - u_origin) / u_resolution')
      + '\nvoid main(){upstreamMain();gl_FragColor.a *= u_opacity;}';
    this.material = new THREE.ShaderMaterial({ uniforms, vertexShader: 'void main(){gl_Position=vec4(position.xy,0.,1.);}', fragmentShader: shader, transparent: true, depthTest: false, depthWrite: false });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material); this.scene.add(this.mesh);
  }
  draw(renderer, analysis, time, config, width, height, lightweight = false) {
    const source = analysis.analyzer;
    if (this.source !== source) { this.raw = null; this.source = source; this.key = null; this.lightSampler = source.version===2?null:new LightweightStereoSampler(source); }
    const key = [config.glowBands, config.glowGain, config.glowFloor, config.glowSmoothing, config.glowPeakDrop].join(':');
    if (source.version!==2&&!lightweight && this.key !== key) { this.raw ??= decodeStereoSpectrum(source); this.track = processStereoTrack(this.raw, config); this.key = key; }
    const bands = config.glowBands ?? 80, channels = source.version===2?source.sampler.sample(time,config):lightweight ? this.lightSampler.sample(time, config) : sampleStereoTrack(this.track, source.fps, time, bands);
    const mono = !(config.glowStereo ?? 1);
    const combine = key => Uint8Array.from(channels[0][key], (v, i) => Math.max(v, channels[1][key][i]));
    const values = [mono ? combine('data') : channels[0].data, mono ? combine('peaks') : channels[0].peaks, channels[1].data, channels[1].peaks];
    // GPU texture storage is immutable after its first upload: allocate anew on resize.
    const textureUniforms = ['u_fftData', 'u_peakData', 'u_fftDataRight', 'u_peakDataRight'];
    this.textures = this.textures.map((texture, i) => {
      if (texture.image.width !== bands) { texture.dispose(); texture = spectrumTexture(values[i]); }
      else { texture.image.data = values[i]; texture.needsUpdate = true; }
      this.material.uniforms[textureUniforms[i]].value = texture;
      return texture;
    });
    const palette = gradients[config.glowGradient ?? 0];
    if (palette !== this.palette) { this.gradient.image.data = buildGradientLUT(gradientPresets[palette]); this.gradient.needsUpdate = true; this.palette = palette; }
    const u = this.material.uniforms;
    // Stretch complete frequency bands to the right edge, cropping the usually
    // empty treble tail from the display only. Keep the underlying FFT intact.
    const minHz = source.minHz ?? 30, maxHz = source.maxHz ?? 20000;
    const visibleBands = config.glowRadial || config.glowRotation || maxHz <= displayMaxHz
      ? bands : Math.max(1, Math.min(bands, Math.floor(bands * Math.log(displayMaxHz / minHz) / Math.log(maxHz / minHz))));
    const w = width * bands / visibleBands, h = height * (config.glowHeight ?? .32), x = 0;
    const y = (height - h) * (1 - (config.glowPosition ?? 1));
    u.u_resolution.value.set(w, h); u.u_origin.value.set(x, y); u.u_bins.value = bands; u.u_dpr.value = width / 1920;
    u.u_opacity.value = config.glowOpacity ?? 1; u.u_barSpace.value = config.glowSpace ?? .4;
    u.u_glow.value = config.glowLight ?? 1; u.u_stereo.value = !!(config.glowStereo ?? 1);
    u.u_showPeaks.value = !!config.glowPeaks; u.u_ledBars.value = !!config.glowLed; u.u_lumiBars.value = !!config.glowLumi;
    u.u_radial.value = !!config.glowRadial; u.u_rotation.value = (config.glowRotation ?? 0) / 90;
    u.u_gradientHorizontal.value = !(config.glowDirection ?? 0); u.u_barLevelColor.value = !!config.glowColorMode;
    const autoClear = renderer.autoClear;
    try {
      renderer.autoClear = false; renderer.setViewport(x, y, w, h);
      renderer.setScissor(x, y, width, h); renderer.setScissorTest(true);
      renderer.render(this.scene, this.camera);
    } finally { renderer.setViewport(0, 0, width, height); renderer.setScissorTest(false); renderer.autoClear = autoClear; }
  }
  dispose() { this.textures.forEach(t => t.dispose()); this.gradient.dispose(); this.material.dispose(); this.mesh.geometry.dispose(); }
}
