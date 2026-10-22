import * as THREE from 'three';
import { SpectrumOverlay } from './spectrum-overlay.js';
import { presets, legacyPresets, photoModelIds as photoModels } from './presets.js';
import { buildImpactTrack, sampleImpact } from './audio-impacts.js';
import { sampleStutter } from './audio-stutter.js';
import { PhotoRelief } from './relief.js';
import { PhotoGranulator } from './granular.js';
import { SortedPhotos } from './sorted-photo.js';
import { BentPhotos } from './bent-photo.js';
import { PhaseImage } from './phase-image.js';
import { PhaseEcho } from './phase-echo.js';
import { PhaseRibbons } from './phase-ribbons.js';
import { PhotoMorph } from './photo-morph.js';
import { PhotoShards } from './photo-shards.js';
import { PhotoReliquary } from './photo-reliquary.js';
import { PhotoPegboard } from './photo-pegboard.js';
import { PhotoMoire } from './photo-moire.js';
import { PhotoShear } from './photo-shear.js';
import { PhotoChrono } from './photo-chrono.js';
import { PhotoVector } from './photo-vector.js';
import { PhotoQuadtree } from './photo-quadtree.js';
import { PhotoRadar } from './photo-radar.js';
import { PhotoSpectrum } from './photo-spectrum.js';
import { PhotoPress } from './photo-press.js';
import { PhotoCircuit } from './photo-circuit.js';
import { PhotoCorruption } from './photo-corruption.js';
import { PhotoFacets } from './photo-facets.js';
import { PhotoBinary } from './photo-binary.js';
import { PhotoPlexus } from './photo-plexus.js';
import { PhotoCodec } from './photo-codec.js';
import { PhotoWeave } from './photo-weave.js';
import { PhotoFeedback } from './photo-feedback.js';
import { PhotoShock } from './photo-shock.js';
import { PhotoRaster } from './photo-raster.js';
import { PhotoCymatics } from './photo-cymatics.js';
import { buildBandIntegral, sampleBandIntegral } from './audio-integral.js';
import { morphProgress } from './morph-timing.js';
import { PhotoVoxels } from './voxel.js';
import { PhotoSculpt } from './photo-sculpt.js';
import { PhotoHolo } from './photo-holo.js';
import { PhotoKinetic } from './photo-kinetic.js';
import { PhotoWavefield } from './photo-wavefield.js';
import { PhotoPortal } from './photo-portal.js';
import { PhotoAdvection } from './photo-advection.js';
import { PhotoLamella } from './photo-lamella.js';
import { PhotoDataGrains } from './photo-data-grains.js';
import { PhotoOrbit } from './photo-orbit.js';
import { PhotoTrace } from './trace.js';
import { MicroMosaic } from './micro-mosaic.js';
import { createAsciiAtlas } from './ascii-atlas.js';
import {sampleResponse} from './audio-response.js';

// Compositor and audio mapping: MusicFrame Render.
// Distortion, kaleidoscope, RGB shift, LED and edge shaders: Astrofox / Mike Cao, MIT.
// The unmodified upstream sources and full attribution are in vendor/astrofox.
const vertexShader = `varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}`;
const imageShader = `
uniform sampler2D picture; uniform vec2 imageSize; uniform vec2 resolution;
uniform float zoom; uniform float rotation; uniform float contain; uniform float exposure;
uniform float bendAmount; uniform float bendMix; uniform float bendBands; uniform float bendPhase;
uniform sampler2D sortedPicture; uniform float sortAmount; uniform float sortAxis; uniform float sortTime;
varying vec2 vUv;
void main(){
 vec2 p=vUv-.5; float c=cos(rotation),s=sin(rotation); p=mat2(c,-s,s,c)*p;
 float screenAspect=resolution.x/resolution.y; float imageAspect=imageSize.x/imageSize.y;
 vec2 ratio=vec2(1.);
 if(contain>.5){if(screenAspect>imageAspect)ratio.x=screenAspect/imageAspect;else ratio.y=imageAspect/screenAspect;}
 else{if(screenAspect>imageAspect)ratio.y=imageAspect/screenAspect;else ratio.x=screenAspect/imageAspect;}
 vec2 uv=p*ratio/zoom+.5;
 if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.)))){gl_FragColor=vec4(0.,0.,0.,1.);return;}
 vec4 color=texture2D(picture,uv);
 if(sortAmount>0.){
   float crossAxis=sortAxis>.5?uv.x:uv.y;
   float stripe=floor(crossAxis*240.);
   float noise=fract(sin(stripe*127.1+13.7)*43758.5453);
   float scan=.12*sin(crossAxis*24.+sortTime);
   float mask=smoothstep(.0,.16,sortAmount-noise+scan*sortAmount);
   color=mix(color,texture2D(sortedPicture,uv),mask);
 }
 if(bendAmount>0.){
   float band=floor(uv.y*bendBands);
   float gate=fract(sin(band*127.1+bendPhase*311.7+13.7)*43758.5453);
   float reveal=smoothstep(0.,.12,bendAmount-gate)*bendMix;
   color=mix(color,texture2D(sortedPicture,uv),reveal);
 }
 gl_FragColor=vec4(color.rgb*color.a*exposure,1.);
}`;

export function sampleAnalysis(analysis,time,sensitivity=1,mode='legacy'){return sampleResponse(analysis,time,sensitivity,mode);}

export class VisualEngine {
  constructor(canvas, width = 960, height = 540) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(1);
    // Raw shader passes preserve the sRGB image values; no tone mapping or double gamma conversion.
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.scene = new THREE.Scene(); this.camera = new THREE.Camera();
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); this.scene.add(this.quad);
    this.targets = [0, 1].map(() => new THREE.WebGLRenderTarget(width, height, { depthBuffer: false, stencilBuffer: false }));
    this.cache = new Map(); this.config = {}; this.width = width; this.height = height;
    this.spectrumOverlay = new SpectrumOverlay();
    this.relief = new PhotoRelief();
    this.granular = new PhotoGranulator();
    this.sortedPhotos = new SortedPhotos();
    this.bentPhotos = new BentPhotos();
    this.phaseImage = new PhaseImage();
    this.phaseEcho = new PhaseEcho();
    this.phaseRibbons = new PhaseRibbons();
    this.photoMorph = new PhotoMorph();
    this.photoShards = new PhotoShards();
    this.photoCymatics = new PhotoCymatics();
    this.photoRaster = new PhotoRaster();
    this.photoShock = new PhotoShock();
    this.photoFeedback = new PhotoFeedback();
    this.photoWeave = new PhotoWeave();
    this.photoPegboard = new PhotoPegboard();
    this.photoMoire = new PhotoMoire();
    this.photoShear = new PhotoShear();
    this.photoChrono = new PhotoChrono();
    this.photoVector = new PhotoVector();
    this.photoQuadtree = new PhotoQuadtree();
    this.photoRadar = new PhotoRadar();
    this.photoSpectrum = new PhotoSpectrum();
    this.photoPress = new PhotoPress();
    this.photoCircuit = new PhotoCircuit();
    this.photoCorruption = new PhotoCorruption();
    this.photoCodec = new PhotoCodec();
    this.photoPlexus = new PhotoPlexus();
    this.photoBinary = new PhotoBinary();
    this.photoFacets = new PhotoFacets();
    this.photoReliquary = new PhotoReliquary();
    this.voxels = new PhotoVoxels();
    this.photoSculpt = new PhotoSculpt();
    this.photoHolo = new PhotoHolo();
    this.photoKinetic = new PhotoKinetic();
    this.photoWavefield = new PhotoWavefield();
    this.photoPortal = new PhotoPortal();
    this.photoAdvection = new PhotoAdvection();
    this.photoLamella = new PhotoLamella();
    this.photoDataGrains = new PhotoDataGrains();
    this.photoOrbit = new PhotoOrbit();
    this.trace = new PhotoTrace();
    this.micro = new MicroMosaic();
    this.image = new THREE.ShaderMaterial({ vertexShader, fragmentShader: imageShader, uniforms: {
      picture: { value: null }, imageSize: { value: new THREE.Vector2(1, 1) }, resolution: { value: new THREE.Vector2(width, height) },
      zoom: { value: 1 }, rotation: { value: 0 }, contain: { value: 0 }, exposure: { value: 1 },
      bendAmount: { value: 0 }, bendMix: { value: .95 }, bendBands: { value: 32 }, bendPhase: { value: 0 },
      sortedPicture: { value: null }, sortAmount: { value: 0 }, sortAxis: { value: 1 }, sortTime: { value: 0 },
    } });
    this.resize(width, height);
  }
  async initialize() {
    const names = ['distortion.glsl', 'kaleidoscope.glsl', 'rgb-shift.glsl', 'classic-noise-3d.glsl', 'led.glsl', 'edge-detection.glsl'];
    const sources = await Promise.all(names.map(async name => {
      const response = await fetch(`/vendor/astrofox/${name}`); if (!response.ok) throw new Error('Effets Astrofox introuvables.'); return response.text();
    }));
    const material = (source, uniforms) => new THREE.ShaderMaterial({ vertexShader, fragmentShader: source, uniforms });
    this.distortion = material(sources[0].replace('#include "../func/classic-noise-3d.glsl"', sources[3]), {
      inputTexture: { value: null }, time: { value: 0 }, amount: { value: 0 }, scale: { value: 3 }, mode: { value: 0 }, resolution: { value: new THREE.Vector2(this.width, this.height) },
    });
    this.kaleidoscope = material(sources[1], { inputTexture: { value: null }, sides: { value: 6 }, angle: { value: 0 } });
    this.rgb = material(sources[2], { inputTexture: { value: null }, amount: { value: 0 }, angle: { value: 0 } });
    this.led = material(sources[4], { inputTexture: { value: null }, spacing: { value: 20 }, size: { value: 20 }, blur: { value: 10 }, resolution: { value: new THREE.Vector2(this.width, this.height) } });
    this.edgeColor = new THREE.Color();
    this.edges = material(sources[5], { inputTexture: { value: null }, resolution: { value: new THREE.Vector2(this.width, this.height) }, thickness: { value: 2.2 }, neon: { value: 1 }, edgeColor: { value: this.edgeColor } });
    const fractureResponse = await fetch('/shaders/fracture.glsl');
    if (!fractureResponse.ok) throw new Error('Effet Fracture introuvable.');
    this.fracture = material(await fractureResponse.text(), {
      inputTexture: { value: null }, pattern: { value: 0 }, amount: { value: 0 }, bands: { value: 28 }, displacement: { value: .65 }, blocks: { value: .55 }, grain: { value: .09 },
    });
    const ditherResponse = await fetch('/shaders/dither.glsl');
    if (!ditherResponse.ok) throw new Error('Effet Trame numérique introuvable.');
    // Bayer 4x4 threshold map from Ditherer's ordered.ts (MIT).
    const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    this.thresholdMap = new THREE.DataTexture(new Float32Array(bayer.map(value => value / 16)), 4, 4, THREE.RedFormat, THREE.FloatType);
    this.thresholdMap.needsUpdate = true;
    this.dither = material(await ditherResponse.text(), {
      inputTexture: { value: null }, thresholdMap: { value: this.thresholdMap },
      pitch: { value: 4 }, levels: { value: 4 }, mixAmount: { value: 1 }, reaction: { value: .8 },
      bass: { value: 0 }, high: { value: 0 }, phase: { value: 0 }, palette: { value: 1 }, scanlines: { value: .3 },
    });
    const opticalResponse = await fetch('/shaders/interference.glsl');
    if (!opticalResponse.ok) throw new Error('Effet Interférences chromatiques introuvable.');
    this.interference = material(await opticalResponse.text(), {
      inputTexture: { value: null }, drive: { value: 0 }, mid: { value: 0 }, high: { value: 0 }, time: { value: 0 },
      dispersion: { value: .7 }, refraction: { value: .45 }, facets: { value: 24 }, interference: { value: .3 }, coating: { value: .6 }, angle: { value: .7854 },
    });
    const asciiResponse = await fetch('/shaders/ascii.glsl');
    if (!asciiResponse.ok) throw new Error('Effet Écran matriciel introuvable.');
    this.asciiAtlas = createAsciiAtlas();
    this.ascii = material(await asciiResponse.text(), {
      inputTexture: { value: null }, glyphAtlas: { value: this.asciiAtlas }, cellSize: { value: 24 },
      textDensity: { value: 1.25 }, reaction: { value: .85 }, glow: { value: .35 }, rain: { value: .4 }, palette: { value: 1 },
      bass: { value: 0 }, high: { value: 0 }, time: { value: 0 },
    });
    const hexResponse = await fetch('/shaders/hex.glsl');
    if (!hexResponse.ok) throw new Error('Effet Trame hexagonale introuvable.');
    this.hex = material(await hexResponse.text(), {
      inputTexture: { value: null }, cellSize: { value: 24 }, fill: { value: .82 }, edges: { value: .35 }, relief: { value: .5 },
      reaction: { value: .8 }, mixAmount: { value: 1 }, bass: { value: 0 }, high: { value: 0 },
    });
    const stutterResponse = await fetch('/shaders/stutter.glsl');
    if (!stutterResponse.ok) throw new Error('Effet Stutter numérique introuvable.');
    this.stutter = material(await stutterResponse.text(), {
      inputTexture: { value: null }, amount: { value: 0 }, pattern: { value: 0 }, stepIndex: { value: 0 },
      punch: { value: .65 }, shift: { value: .45 }, echo: { value: .35 }, contrast: { value: .3 },
    });
    const topoResponse = await fetch('/shaders/topography.glsl');
    if (!topoResponse.ok) throw new Error('Effet Topographie numérique introuvable.');
    this.topography = material(await topoResponse.text(), {
      inputTexture: { value: null }, levels: { value: 12 }, lineWidth: { value: 1.2 }, contrast: { value: .55 },
      reaction: { value: .8 }, scan: { value: .4 }, background: { value: .2 }, palette: { value: 2 },
      bass: { value: 0 }, mid: { value: 0 }, high: { value: 0 }, time: { value: 0 }, pixelScale: { value: 1 },
    });
    const crtResponse = await fetch('/shaders/crt.glsl');
    if (!crtResponse.ok) throw new Error('Effet Tube cathodique introuvable.');
    this.crt = material(await crtResponse.text(), {
      inputTexture: { value: null }, resolution: { value: new THREE.Vector2(this.width, this.height) },
      curvature: { value: .6 }, scanlines: { value: .65 }, glow: { value: .65 }, fringe: { value: .5 },
      noise: { value: .15 }, reaction: { value: 1 }, bass: { value: 0 }, mid: { value: 0 }, high: { value: 0 }, time: { value: 0 },
    });
    const stippleResponse = await fetch('/shaders/stipple.glsl');
    if (!stippleResponse.ok) throw new Error('Effet Pointillisme granulaire introuvable.');
    this.stipple = material(await stippleResponse.text(), {
      inputTexture: { value: null }, spacing: { value: 7 }, size: { value: .28 }, density: { value: 1.3 },
      reaction: { value: 1 }, scatter: { value: .8 }, background: { value: .06 }, palette: { value: 1 },
      bass: { value: 0 }, high: { value: 0 }, time: { value: 0 }, pixelScale: { value: 1 },
    });
    const mirrorResponse = await fetch('/shaders/mirror-grain.glsl');
    if (!mirrorResponse.ok) throw new Error('Effet Prisme granulaire introuvable.');
    this.mirrorgrain = material(await mirrorResponse.text(), {
      inputTexture: { value: null }, resolution: { value: new THREE.Vector2(this.width, this.height) },
      folds: { value: 6 }, scale: { value: .35 }, density: { value: 320 }, fillAmount: { value: .7 },
      angle: { value: 0 }, reaction: { value: 1 }, bass: { value: 0 }, high: { value: 0 }, impact: { value: 0 }, amount: { value: 1 },
    });
    const crystalResponse = await fetch('/shaders/crystal.glsl');
    if (!crystalResponse.ok) throw new Error('Effet Mosaïque cristalline introuvable.');
    this.crystal = material(await crystalResponse.text(), {
      inputTexture: { value: null }, resolution: { value: new THREE.Vector2(this.width, this.height) },
      columns: { value: 180 }, edges: { value: .2 }, motion: { value: .5 }, pulse: { value: 1 },
      saturation: { value: 1 }, mixAmount: { value: 1 }, phase: { value: 0 }, bass: { value: 0 }, high: { value: 0 }, impact: { value: 0 },
    });
    const intarsiaResponse = await fetch('/shaders/intarsia.glsl');
    if (!intarsiaResponse.ok) throw new Error('Effet Mosaïque active introuvable.');
    this.intarsia = material(await intarsiaResponse.text(), {
      inputTexture: { value: null }, resolution: { value: new THREE.Vector2(this.width, this.height) },
      columns: { value: 160 }, fillAmount: { value: .95 }, density: { value: .85 }, glow: { value: .6 },
      reaction: { value: 1 }, background: { value: .08 }, phase: { value: 0 }, amount: { value: 1 },
      bass: { value: 0 }, high: { value: 0 }, impact: { value: 0 },
    });
    const fenestraResponse = await fetch('/shaders/fenestra.glsl');
    if (!fenestraResponse.ok) throw new Error('Effet Fenêtres de signal introuvable.');
    this.fenestra = material(await fenestraResponse.text(), {
      inputTexture: { value: null }, resolution: { value: new THREE.Vector2(this.width, this.height) },
      count: { value: 8 }, magnify: { value: .75 }, edges: { value: .65 }, links: { value: .6 },
      background: { value: .55 }, reaction: { value: 1 }, bass: { value: 0 }, mid: { value: 0 }, high: { value: 0 }, impact: { value: 0 },
    });
    const tesseraResponse = await fetch('/shaders/tessera.glsl');
    if (!tesseraResponse.ok) throw new Error('Effet Décodage numérique introuvable.');
    this.tessera = material(await tesseraResponse.text(), {
      inputTexture: { value: null }, resolution: { value: new THREE.Vector2(this.width, this.height) },
      columns: { value: 48 }, obscure: { value: .85 }, edges: { value: .7 }, flash: { value: .6 },
      direction: { value: 0 }, reaction: { value: 1 }, bass: { value: 0 }, mid: { value: 0 }, high: { value: 0 }, impact: { value: 0 },
    });
    const etchResponse = await fetch('/shaders/etch.glsl');
    if (!etchResponse.ok) throw new Error('Effet Oscillographe photo introuvable.');
    this.etch = material(await etchResponse.text(), {
      inputTexture: { value: null }, resolution: { value: new THREE.Vector2(this.width, this.height) },
      rows: { value: 110 }, swing: { value: .75 }, weight: { value: .65 }, photoColor: { value: .65 },
      background: { value: .05 }, reaction: { value: 1 }, phase: { value: 0 },
      bass: { value: 0 }, mid: { value: 0 }, high: { value: 0 }, impact: { value: 0 },
    });
    const tunnelResponse = await fetch('/shaders/tunnel.glsl');
    if (!tunnelResponse.ok) throw new Error('Effet Tunnel photographique introuvable.');
    this.tunnel = material(await tunnelResponse.text(), {
      inputTexture: { value: null }, aspect: { value: this.width / this.height }, time: { value: 0 }, travel: { value: 0 },
      panels: { value: 8 }, depth: { value: .4 }, twist: { value: .55 }, grid: { value: .35 }, photo: { value: .9 },
      reaction: { value: 1 }, bass: { value: 0 }, mid: { value: 0 }, high: { value: 0 }, impact: { value: 0 },
    });
    this.copy = material('uniform sampler2D inputTexture; varying vec2 vUv; void main(){gl_FragColor=vec4(texture2D(inputTexture,vUv).rgb,1.);}', { inputTexture: { value: null } });
    // Compile on startup so shader errors are visible before starting a long export.
    for (const pass of [this.image, this.distortion, this.kaleidoscope, this.rgb, this.led, this.edges, this.fracture, this.dither, this.interference, this.ascii, this.hex, this.stutter, this.topography, this.crt, this.stipple, this.tunnel, this.etch, this.tessera, this.fenestra, this.intarsia, this.crystal, this.mirrorgrain, this.photoMoire.material, this.photoShear.material, this.photoChrono.material, this.photoVector.material, this.photoQuadtree.material, this.photoRadar.material, this.photoSpectrum.material, this.photoPress.material, this.photoCircuit.material, this.photoCorruption.material, this.photoCodec.material, this.photoBinary.material, this.copy]) { this.quad.material = pass; this.renderer.compile(this.scene, this.camera); }
    return this;
  }
  setProject(project, analysis) { this.project = project; this.analysis = analysis; this.impacts = buildImpactTrack(analysis); this.levelIntegral = buildBandIntegral(analysis, 0); this.bassIntegral = buildBandIntegral(analysis); this.config = { ...project.config }; }
  setConfig(config) { this.config = { ...config }; }
  setSpectrumOverlay(config) { this.overlayConfig = config ? { ...config } : null; }
  setLightweightPreview(enabled) { this.lightweightPreview = !!enabled; }
  resize(width, height) {
    this.width = width; this.height = height; this.renderer.setSize(width, height, false);
    this.targets.forEach(target => target.setSize(width, height));
    this.image.uniforms.resolution.value.set(width, height);
    this.distortion?.uniforms.resolution.value.set(width, height);
    this.led?.uniforms.resolution.value.set(width, height);
    this.edges?.uniforms.resolution.value.set(width, height);
  }
  async texture(image) {
    if (this.cache.has(image.url)) return this.cache.get(image.url);
    const picture = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error(`Impossible de charger ${image.name}.`)); img.src = image.url; });
    const texture = new THREE.Texture(picture);
    texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false; texture.colorSpace = THREE.NoColorSpace; texture.needsUpdate = true;
    this.cache.set(image.url, texture);
    if (this.cache.size > 2) { const oldest = this.cache.keys().next().value; this.cache.get(oldest).dispose(); this.cache.delete(oldest); }
    return texture;
  }
  pass(material, target) { this.quad.material = material; this.renderer.setRenderTarget(target); this.renderer.render(this.scene, this.camera); }
  async draw(time, { target = null, overlay = true, imageIndex = null, imageTime = time } = {}) {
    if(overlay)await this.analysis.ensure?.(time,this.config);
    if (!this.project?.images.length) return;
    const embeddedOverlay = this.config.preset === 'stereoGlow' ? this.config : null;
    const overlayConfig = embeddedOverlay || this.overlayConfig;
    const base = embeddedOverlay && photoModels[(embeddedOverlay.glowPhoto ?? 0) - 1];
    const config = embeddedOverlay ? { ...this.config, ...(base ? (presets[base] || legacyPresets[base]) : { intensity: 0, zoom: 0, distortion: 0, rgb: 0, kaleidoscope: 0 }), preset: base || 'pulse' } : this.config;
    const index = (imageIndex ?? Math.floor(Math.max(0, imageTime) / config.imageSeconds)) % this.project.images.length;
    const image = this.project.images[index]; const texture = await this.texture(image);
    const [level, bass, mid, high] = sampleAnalysis(this.analysis, time, config.sensitivity, config.audioResponse);
    const strength = config.intensity;
    const onsetAt=(time,gain=1,release=.18)=>sampleImpact(this.impacts,time,config.sensitivity,gain,release,config.audioResponse);
    const transient = config.preset === 'stutter' ? sampleStutter(this.impacts, time, config.sensitivity, config.stutterDuration ?? .32, config.stutterRepeats ?? 3, config.audioResponse) : config.preset === 'fracture' ? onsetAt(time, config.glitchAttack ?? 1.4, config.glitchRelease ?? .18) : { impact: 0, pattern: 0 };
    const onsetDriven = ['fracture', 'stutter'].includes(config.preset);
    this.image.uniforms.picture.value = texture;
    this.image.uniforms.sortedPicture.value = config.preset === 'databend' ? this.bentPhotos.texture(texture.image, config) : config.preset === 'pixelsort' ? this.sortedPhotos.texture(texture.image, config) : texture;
    this.image.uniforms.sortAmount.value = config.preset === 'pixelsort' ? (config.sortMix ?? 1) * strength * Math.min(1.15, bass * .85 + mid * .25) : 0;
    const bendReaction = config.bendReaction ?? 1;
    this.image.uniforms.bendAmount.value = config.preset === 'databend' ? strength * ((1 - bendReaction) + bendReaction * Math.min(1.12, bass * .65 + level * .25 + high * .35)) : 0;
    this.image.uniforms.bendMix.value = config.bendMix ?? .95;
    this.image.uniforms.bendBands.value = config.bendBands ?? 32;
    this.image.uniforms.bendPhase.value = Math.floor(time * config.speed * 14);
    this.image.uniforms.sortAxis.value = config.sortDirection ?? 1;
    this.image.uniforms.sortTime.value = time * config.speed * 3;
    this.image.uniforms.imageSize.value.set(image.width, image.height);
    this.image.uniforms.contain.value = config.fit === 'contain' ? 1 : 0;
    this.image.uniforms.zoom.value = 1 + config.zoom * strength * (onsetDriven ? transient.impact * .18 : 0.035 + bass * 0.13);
    this.image.uniforms.rotation.value = config.preset === 'prism' ? Math.sin(time * 0.12) * 0.025 * strength : 0;
    this.image.uniforms.exposure.value = 1 + strength * (onsetDriven ? transient.impact * .14 : level * .08);
    if (config.preset === 'dataGrains') this.photoDataGrains.draw(this.renderer, this.targets[0], texture, config, time, [level,bass,mid,high], this.impacts, this.width, this.height);
    else if (config.preset === 'pegboard') {
      const onset = onsetAt(time, 1, .2);
      this.photoPegboard.draw(this.renderer, this.targets[0], texture, config, time, [level,bass,mid,high], onset, this.width, this.height);
    }
    else if (config.preset === 'facets') {
      const onset = onsetAt(time, 1, .12);
      this.copy.uniforms.inputTexture.value = this.photoFacets.draw(this.renderer, texture, config, time, [level,bass,mid,high], onset, this.width, this.height);
      this.pass(this.copy, this.targets[0]);
    }
    else if (config.preset === 'plexus') {
      const onset = onsetAt(time, 1, .12);
      this.photoPlexus.draw(this.renderer, this.targets[0], texture, config, time, [level,bass,mid,high], onset, this.width, this.height);
    }
    else if (['feedback', 'weave'].includes(config.preset)) {
      const frameAt = t => {
        const bands = sampleAnalysis(this.analysis, t, config.sensitivity, config.audioResponse);
        return { bass: bands[1], mid: bands[2], high: bands[3], ...onsetAt(t, 1, .12) };
      };
      this.copy.uniforms.inputTexture.value = await (config.preset === 'weave' ? this.photoWeave : this.photoFeedback).draw(texture.image, config, time, frameAt, this.width, this.height);
      this.pass(this.copy, this.targets[0]);
    }
    else if (config.preset === 'shock') {
      this.photoShock.draw(this.renderer, this.targets[0], texture, config, time, [level, bass, mid, high], this.impacts, this.width, this.height);
    }
    else if (config.preset === 'raster') {
      const transient = onsetAt(time, 1, .18);
      this.photoRaster.draw(this.renderer, this.targets[0], texture, config, time, [level, bass, mid, high], transient, this.width, this.height);
    }
    else if (config.preset === 'reliquary') {
      const impact = onsetAt(time, 1, .2).impact;
      const phase = (time * .35 + sampleBandIntegral(this.levelIntegral, time) * config.sensitivity * 1.4 * strength) * config.speed;
      this.photoReliquary.draw(this.renderer, this.targets[0], texture, config, [level, bass, mid, high], impact, phase, this.width, this.height);
    }
    else if (config.preset === 'cymatics') {
      this.photoCymatics.draw(this.renderer, this.targets[0], texture, config, time, [level, bass, mid, high], this.width, this.height);
    }
    else if (config.preset === 'shards') {
      const shardImpact = onsetAt(time, 1, .16).impact;
      this.photoShards.draw(this.renderer, this.targets[0], texture, config, [level, bass, mid, high], shardImpact, this.width, this.height);
    }
    else if (config.preset === 'morph') {
      const nextImage = this.project.images[(index + 1) % this.project.images.length];
      const nextTexture = await this.texture(nextImage);
      const progress = morphProgress(imageTime, config.imageSeconds, config.morphDuration ?? 1.2);
      const morphImpact = onsetAt(time, 1, .18).impact;
      this.photoMorph.draw(this.renderer, this.targets[0], texture.image, nextTexture.image, config, time, [level, bass, mid, high], morphImpact, this.width, progress);
    }
    else if (config.preset === 'ribbons') {
      this.copy.uniforms.inputTexture.value = this.phaseRibbons.draw(texture.image, config, time, [level, bass, mid, high], this.width, this.height);
      this.pass(this.copy, this.targets[0]);
    }
    else if (config.preset === 'echo') {
      const frameAt = sampleTime => {
        const bands = sampleAnalysis(this.analysis, sampleTime, config.sensitivity, config.audioResponse);
        return { volume: bands[0], bass: bands[1], mid: bands[2], high: bands[3], impact: onsetAt(sampleTime, 1, .14).impact };
      };
      this.copy.uniforms.inputTexture.value = this.phaseEcho.draw(texture.image, config, time, frameAt, this.width, this.height);
      this.pass(this.copy, this.targets[0]);
    }
    else if (config.preset === 'phase') {
      const phaseImpact = onsetAt(time, 1, .14).impact;
      this.copy.uniforms.inputTexture.value = this.phaseImage.draw(texture.image, config, time, [level, bass, mid, high], phaseImpact, this.width, this.height);
      this.pass(this.copy, this.targets[0]);
    }
    else if (config.preset === 'trace') {
      this.copy.uniforms.inputTexture.value = this.trace.draw(this.renderer, texture.image, texture, config, time, [level, bass, mid, high], this.width, this.height);
      this.pass(this.copy, this.targets[0]);
    }
    else if (config.preset === 'portal') {
      this.copy.uniforms.inputTexture.value = this.photoPortal.draw(this.renderer, texture, config, time, this.impacts, this.width, this.height);
      this.pass(this.copy, this.targets[0]);
    }
    else if (config.preset === 'wavefield') {
      this.copy.uniforms.inputTexture.value = this.photoWavefield.draw(this.renderer, texture, config, time, [level,bass,mid,high], this.analysis, this.width, this.height);
      this.pass(this.copy, this.targets[0]);
    }
    else if (config.preset === 'kinetic') {
      const impact = onsetAt(time, 1, .16).impact;
      this.copy.uniforms.inputTexture.value = this.photoKinetic.draw(this.renderer, texture, config, time, [level,bass,mid,high], impact, this.width, this.height);
      this.pass(this.copy, this.targets[0]);
    }
    else if (config.preset === 'holo') {
      const impact = onsetAt(time, 1, .16).impact;
      this.copy.uniforms.inputTexture.value = this.photoHolo.draw(this.renderer, texture, config, time, [level,bass,mid,high], impact, this.width, this.height);
      this.pass(this.copy, this.targets[0]);
    }
    else if (config.preset === 'sculpt') {
      const impact = onsetAt(time, 1, .16).impact;
      this.copy.uniforms.inputTexture.value = this.photoSculpt.draw(this.renderer, texture, config, time, [level,bass,mid,high], impact, this.width, this.height);
      this.pass(this.copy, this.targets[0]);
    }
    else if (config.preset === 'voxel') {
      this.copy.uniforms.inputTexture.value = this.voxels.draw(this.renderer, texture.image, config, time, [level, bass, mid, high], this.width, this.height);
      this.pass(this.copy, this.targets[0]);
    }
    else if (config.preset === 'relief') this.relief.draw(this.renderer, this.targets[0], texture.image, config, time, [level, bass, mid, high], this.width, this.height);
    else this.pass(this.image, this.targets[0]);
    let input = this.targets[0]; let output = this.targets[1];
    const advance = material => { material.uniforms.inputTexture.value = input.texture; this.pass(material, output); [input, output] = [output, input]; };
    if (config.preset === 'orbit') advance(this.photoOrbit.configure(config, time, this.analysis, this.impacts));
    if (config.preset === 'lamella') advance(this.photoLamella.configure(config, time, [level,bass,mid,high], this.impacts));
    if (config.preset === 'advection') advance(this.photoAdvection.configure(config, time, [level,bass,mid,high], this.impacts));
    if (config.preset === 'moire') {
      const onset = onsetAt(time, 1, .12);
      advance(this.photoMoire.configure(config, time, this.analysis, onset));
    }
    if (config.preset === 'shear') {
      const onset = onsetAt(time, 1, .12);
      advance(this.photoShear.configure(config, time, this.analysis, onset));
    }
    if (config.preset === 'chrono') {
      advance(this.photoChrono.configure(config, time, t => sampleAnalysis(this.analysis, t, config.sensitivity, config.audioResponse)));
    }
    if (config.preset === 'vector') {
      const onset = onsetAt(time, 1, .12);
      advance(this.photoVector.configure(config, time, this.analysis, onset));
    }
    if (config.preset === 'quadtree') {
      const onset = onsetAt(time, 1, .12);
      advance(this.photoQuadtree.configure(config, time, this.analysis, onset));
    }
    if (config.preset === 'radar') {
      const onset = onsetAt(time, 1, .12);
      advance(this.photoRadar.configure(config, time, this.analysis, onset));
    }
    if (config.preset === 'spectrum') {
      const onset = onsetAt(time, 1, .12);
      advance(this.photoSpectrum.configure(config, time, this.analysis, onset));
    }
    if (config.preset === 'press') {
      const onset = onsetAt(time, 1, .12);
      advance(this.photoPress.configure(config, time, [level,bass,mid,high], onset));
    }
    if (config.preset === 'circuit') {
      const onset = onsetAt(time, 1, .12);
      advance(this.photoCircuit.configure(config, time, [level,bass,mid,high], onset));
    }
    if (config.preset === 'corruption') {
      const onset = onsetAt(time, 1, .12);
      advance(await this.photoCorruption.configure(texture.image, config, [level,bass,mid,high], onset));
    }
    if (config.preset === 'binary') {
      const onset = onsetAt(time, 1, .12);
      advance(this.photoBinary.configure(config, time, [level,bass,mid,high], onset));
    }
    if (config.preset === 'codec') {
      const onset = onsetAt(time, 1, .12);
      advance(await this.photoCodec.configure(texture.image, config, time, [level,bass,mid,high], onset, this.width, this.height));
    }
    if (config.preset === 'stutter') {
      const uniforms = this.stutter.uniforms;
      uniforms.amount.value = transient.impact * strength;
      uniforms.pattern.value = transient.pattern; uniforms.stepIndex.value = transient.step;
      uniforms.punch.value = config.stutterPunch ?? .65;
      uniforms.shift.value = config.stutterShift ?? .45;
      uniforms.echo.value = config.stutterEcho ?? .35;
      uniforms.contrast.value = config.stutterContrast ?? .3;
      advance(this.stutter);
    }
    if (config.preset === 'micro') {
      const previous = sampleAnalysis(this.analysis, Math.max(0, time - .05), config.sensitivity, config.audioResponse);
      this.micro.draw(this.renderer, input, output, config, time, [level, bass, mid, high], Math.max(0, level - previous[0]));
      [input, output] = [output, input];
    }
    if (config.preset === 'granular') {
      this.granular.draw(this.renderer, input, output, config, time, [level, bass, mid, high], this.width, this.height);
      [input, output] = [output, input];
    }
    if (config.preset === 'interference') {
      const uniforms = this.interference.uniforms;
      uniforms.drive.value = Math.min(1.5, bass * .75 + mid * .25 + high * .2) * strength;
      uniforms.mid.value = mid * strength; uniforms.high.value = high * strength;
      uniforms.time.value = time * config.speed * 2;
      uniforms.dispersion.value = config.opticsDispersion ?? .7;
      uniforms.refraction.value = config.opticsRefraction ?? .45;
      uniforms.facets.value = config.opticsFacets ?? 24;
      uniforms.interference.value = config.opticsLines ?? .3;
      uniforms.coating.value = config.opticsCoating ?? .6;
      uniforms.angle.value = (config.opticsAngle ?? 45) * Math.PI / 180;
      advance(this.interference);
    }
    if (config.distortion > 0) {
      this.distortion.uniforms.time.value = time * (0.3 + config.speed * 3);
      this.distortion.uniforms.amount.value = config.distortion * strength * (0.25 + bass * 2.2);
      this.distortion.uniforms.scale.value = 3 + config.speed * 8;
      this.distortion.uniforms.mode.value = config.preset === 'spectral' ? 1 : 0;
      advance(this.distortion);
    }
    if (config.kaleidoscope >= 2) {
      this.kaleidoscope.uniforms.sides.value = Math.round(config.kaleidoscope);
      this.kaleidoscope.uniforms.angle.value = time * config.speed * 0.08 + mid * strength * 0.035;
      advance(this.kaleidoscope);
    }
    if (config.preset === 'neon') {
      // Thickness is measured in final 1080p pixels, with matching preview framing.
      this.edges.uniforms.thickness.value = (config.edgeThickness ?? 2.2) * this.width / 1920 * (.7 + bass * strength * .6);
      const hue = (config.neonHue ?? .53) + Math.sin(time * (.1 + config.speed * .35)) * .06 * strength + high * strength * .04;
      const brightness = (.4 + (config.edgeBrightness ?? .65) * 1.8) * (.65 + level * strength * .6);
      this.edgeColor.setHSL((hue % 1 + 1) % 1, .9, .57).multiplyScalar(brightness);
      advance(this.edges);
    }
    if (config.preset === 'fracture') {
      const uniforms = this.fracture.uniforms;
      uniforms.pattern.value = transient.pattern;
      uniforms.amount.value = strength * transient.impact * 2.6;
      uniforms.bands.value = config.glitchBands ?? 28;
      uniforms.displacement.value = config.glitchShift ?? .65;
      uniforms.blocks.value = config.glitchBlocks ?? .55;
      uniforms.grain.value = config.glitchGrain ?? .09;
      advance(this.fracture);
    }
    if (config.rgb > 0) {
      this.rgb.uniforms.amount.value = config.rgb * strength * (onsetDriven ? transient.impact * .025 : high * .018);
      this.rgb.uniforms.angle.value = onsetDriven ? transient.pattern * 2.399963 : time * 0.15;
      advance(this.rgb);
    }
    if (config.preset === 'dither') {
      const uniforms = this.dither.uniforms;
      uniforms.pitch.value = config.ditherPitch ?? 4;
      uniforms.levels.value = Math.round(config.ditherLevels ?? 4);
      uniforms.mixAmount.value = config.ditherMix ?? 1;
      uniforms.reaction.value = (config.ditherReaction ?? .8) * strength;
      uniforms.bass.value = bass; uniforms.high.value = high;
      // Seekable phase changes; no accumulating history or browser-clock drift.
      uniforms.phase.value = (Math.floor(time * config.speed * 8) % 16) * (level * strength > .01 ? 1 : 0);
      uniforms.palette.value = config.ditherPalette ?? 1;
      uniforms.scanlines.value = config.ditherScan ?? .3;
      advance(this.dither);
    }
    if (config.preset === 'ascii') {
      const uniforms = this.ascii.uniforms;
      uniforms.cellSize.value = config.asciiSize ?? 24;
      uniforms.textDensity.value = config.asciiDensity ?? 1.25;
      uniforms.reaction.value = config.asciiReaction ?? .85;
      uniforms.glow.value = config.asciiGlow ?? .35;
      uniforms.rain.value = config.asciiRain ?? .4;
      uniforms.palette.value = config.asciiPalette ?? 1;
      uniforms.bass.value = bass * strength; uniforms.high.value = high * strength;
      uniforms.time.value = time * config.speed;
      advance(this.ascii);
    }
    if (config.preset === 'hex') {
      const uniforms = this.hex.uniforms;
      uniforms.cellSize.value = config.hexSize ?? 24;
      uniforms.fill.value = config.hexFill ?? .82;
      uniforms.edges.value = config.hexEdges ?? .35;
      uniforms.relief.value = config.hexRelief ?? .5;
      uniforms.reaction.value = (config.hexReaction ?? .8) * strength;
      uniforms.mixAmount.value = config.hexMix ?? 1;
      uniforms.bass.value = bass; uniforms.high.value = high;
      advance(this.hex);
    }
    if (config.preset === 'topography') {
      const uniforms = this.topography.uniforms;
      uniforms.levels.value = config.topoLevels ?? 12;
      uniforms.lineWidth.value = config.topoWidth ?? 1.2;
      uniforms.contrast.value = config.topoContrast ?? .55;
      uniforms.reaction.value = (config.topoReaction ?? .8) * strength;
      uniforms.scan.value = config.topoScan ?? .4;
      uniforms.background.value = config.topoBackground ?? .2;
      uniforms.palette.value = config.topoPalette ?? 2;
      uniforms.bass.value = bass; uniforms.mid.value = mid; uniforms.high.value = high;
      uniforms.time.value = time * config.speed; uniforms.pixelScale.value = this.width / 1920;
      advance(this.topography);
    }
    if (config.preset === 'crt') {
      const u = this.crt.uniforms;
      u.resolution.value.set(this.width, this.height);
      u.curvature.value = config.crtCurve ?? .6;
      u.scanlines.value = config.crtLines ?? .65;
      u.glow.value = config.crtGlow ?? .65;
      u.fringe.value = config.crtFringe ?? .5;
      u.noise.value = config.crtNoise ?? .15;
      u.reaction.value = (config.crtReaction ?? 1) * strength;
      u.bass.value = bass; u.mid.value = mid; u.high.value = high;
      u.time.value = time * config.speed;
      advance(this.crt);
    }
    if (config.preset === 'stipple') {
      const u = this.stipple.uniforms;
      u.spacing.value = config.stippleSpacing ?? 7;
      u.size.value = config.stippleSize ?? .28;
      u.density.value = config.stippleDensity ?? 1.3;
      u.reaction.value = (config.stippleReaction ?? 1) * strength;
      u.scatter.value = config.stippleScatter ?? .8;
      u.background.value = config.stippleBackground ?? .06;
      u.palette.value = config.stipplePalette ?? 1;
      u.bass.value = bass; u.high.value = high;
      u.time.value = time * config.speed; u.pixelScale.value = this.width / 1920;
      advance(this.stipple);
    }
    if (config.preset === 'mirrorgrain') {
      const u = this.mirrorgrain.uniforms;
      u.resolution.value.set(this.width, this.height);
      u.folds.value = config.mirrorFolds ?? 6; u.scale.value = config.mirrorScale ?? .35;
      u.density.value = config.mirrorDensity ?? 320; u.fillAmount.value = config.mirrorFill ?? .7;
      u.reaction.value = (config.mirrorReaction ?? 1) * strength; u.amount.value = strength;
      u.angle.value = (time * .12 + sampleBandIntegral(this.levelIntegral, time) * config.sensitivity * u.reaction.value * .12) * config.speed * (config.mirrorRotation ?? .25);
      u.bass.value = bass; u.high.value = high;
      u.impact.value = onsetAt(time, 1, .16).impact;
      advance(this.mirrorgrain);
    }
    if (config.preset === 'crystal') {
      const u = this.crystal.uniforms;
      u.resolution.value.set(this.width, this.height);
      u.columns.value = config.crystalColumns ?? 180; u.edges.value = (config.crystalEdges ?? .2) * strength;
      u.motion.value = (config.crystalMotion ?? .5) * strength; u.pulse.value = (config.crystalPulse ?? 1) * strength;
      u.saturation.value = config.crystalSaturation ?? 1; u.mixAmount.value = (config.crystalMix ?? 1) * strength;
      u.phase.value = (time * .3 + sampleBandIntegral(this.levelIntegral, time) * config.sensitivity * strength) * config.speed;
      u.bass.value = bass; u.high.value = high;
      u.impact.value = onsetAt(time, 1, .16).impact;
      advance(this.crystal);
    }
    if (config.preset === 'intarsia') {
      const u = this.intarsia.uniforms, reaction = (config.inlayReaction ?? 1) * strength;
      u.resolution.value.set(this.width, this.height);
      u.columns.value = config.inlayColumns ?? 160; u.fillAmount.value = config.inlayFill ?? .95;
      u.density.value = config.inlayDensity ?? .85; u.glow.value = config.inlayGlow ?? .6;
      u.reaction.value = reaction; u.background.value = config.inlayBackground ?? .08;
      u.phase.value = (time * .06 + sampleBandIntegral(this.levelIntegral, time) * config.sensitivity * .9 * reaction) * config.speed;
      u.bass.value = bass; u.high.value = high; u.amount.value = strength;
      u.impact.value = onsetAt(time, 1, .16).impact;
      advance(this.intarsia);
    }
    if (config.preset === 'fenestra') {
      const u = this.fenestra.uniforms;
      u.resolution.value.set(this.width, this.height);
      u.count.value = config.panelCount ?? 8; u.magnify.value = config.panelMagnify ?? .75;
      u.edges.value = (config.panelEdges ?? .65) * strength; u.links.value = (config.panelLinks ?? .6) * strength;
      u.background.value = 1 - (1 - (config.panelBackground ?? .55)) * strength;
      u.reaction.value = (config.panelReaction ?? 1) * strength;
      u.bass.value = bass; u.mid.value = mid; u.high.value = high;
      u.impact.value = onsetAt(time, 1, .2).impact;
      advance(this.fenestra);
    }
    if (config.preset === 'tessera') {
      const u = this.tessera.uniforms;
      u.resolution.value.set(this.width, this.height);
      u.columns.value = config.tileColumns ?? 48; u.obscure.value = (config.tileObscure ?? .85) * strength;
      u.edges.value = (config.tileEdges ?? .7) * strength; u.flash.value = (config.tileFlash ?? .6) * strength;
      u.direction.value = config.tileDirection ?? 0; u.reaction.value = (config.tileReaction ?? 1) * strength;
      u.bass.value = bass; u.mid.value = mid; u.high.value = high;
      u.impact.value = onsetAt(time, 1, .16).impact;
      advance(this.tessera);
    }
    if (config.preset === 'etch') {
      const u = this.etch.uniforms, reaction = (config.etchReaction ?? 1) * strength;
      u.resolution.value.set(this.width, this.height);
      u.rows.value = config.etchRows ?? 110; u.swing.value = config.etchSwing ?? .75;
      u.weight.value = config.etchWeight ?? .65; u.photoColor.value = config.etchColor ?? .65;
      u.background.value = config.etchBackground ?? .05; u.reaction.value = reaction;
      u.phase.value = (time * .15 + sampleBandIntegral(this.bassIntegral, time) * config.sensitivity * reaction * .8) * config.speed;
      u.bass.value = bass; u.mid.value = mid; u.high.value = high;
      u.impact.value = onsetAt(time, 1, .14).impact;
      advance(this.etch);
    }
    if (config.preset === 'tunnel') {
      const u = this.tunnel.uniforms;
      const reaction = (config.tunnelReaction ?? 1) * strength;
      u.aspect.value = this.width / this.height; u.time.value = time * config.speed;
      u.travel.value = (time * .4 + sampleBandIntegral(this.bassIntegral, time) * config.sensitivity * reaction * .35) * config.speed;
      u.panels.value = config.tunnelPanels ?? 8; u.depth.value = config.tunnelDepth ?? .4;
      u.twist.value = config.tunnelTwist ?? .55; u.grid.value = config.tunnelGrid ?? .35;
      u.photo.value = config.tunnelPhoto ?? .9; u.reaction.value = reaction;
      u.bass.value = bass; u.mid.value = mid; u.high.value = high;
      u.impact.value = onsetAt(time, 1, .16).impact;
      advance(this.tunnel);
    }
    if (config.preset === 'led') {
      // Express spacing in final 1080p pixels, preserving the same grid in the preview.
      const spacing = (config.ledSpacing ?? 20) * this.width / 1920;
      const pulse = .78 + bass * strength * .24 + Math.sin(time * (.6 + config.speed * 3)) * level * strength * .035;
      const radius = spacing * (.13 + (config.ledFill ?? .7) * .3) * pulse;
      this.led.uniforms.spacing.value = spacing;
      this.led.uniforms.size.value = radius * radius;
      this.led.uniforms.blur.value = spacing * spacing * (.005 + (config.ledGlow ?? .45) * .09) * (1 + high * strength * .2);
      advance(this.led);
    }
    this.copy.uniforms.inputTexture.value = input.texture; this.pass(this.copy, target);
    if (overlay && overlayConfig) this.spectrumOverlay.draw(this.renderer, this.analysis, time, overlayConfig, this.width, this.height, this.lightweightPreview);
    return { index, level, bass, mid, high, impact: transient.impact };
  }
  dispose() {
    this.spectrumOverlay.dispose();
    this.relief.dispose();
    this.granular.dispose();
    this.sortedPhotos.dispose();
    this.bentPhotos.dispose();
    this.phaseImage.dispose();
    this.phaseEcho.dispose();
    this.phaseRibbons.dispose();
    this.photoMorph.dispose();
    this.photoShards.dispose();
    this.photoCymatics.dispose();
    this.photoRaster.dispose();
    this.photoShock.dispose();
    this.photoFeedback.dispose();
    this.photoWeave.dispose();
    this.photoPegboard.dispose();
    this.photoMoire.dispose();
    this.photoShear.dispose();
    this.photoChrono.dispose();
    this.photoVector.dispose();
    this.photoQuadtree.dispose();
    this.photoRadar.dispose();
    this.photoSpectrum.dispose();
    this.photoPress.dispose();
    this.photoCircuit.dispose();
    this.photoCorruption.dispose();
    this.photoCodec.dispose();
    this.photoPlexus.dispose();
    this.photoBinary.dispose();
    this.photoFacets.dispose();
    this.photoReliquary.dispose();
    this.voxels.dispose();
    this.photoSculpt.dispose();
    this.photoHolo.dispose();
    this.photoKinetic.dispose();
    this.photoWavefield.dispose();
    this.photoPortal.dispose();
    this.photoAdvection.dispose();
    this.photoLamella.dispose();
    this.photoDataGrains.dispose();
    this.photoOrbit.dispose();
    this.trace.dispose();
    this.micro.dispose();
    this.thresholdMap?.dispose();
    this.asciiAtlas?.dispose();
    this.cache.forEach(texture => texture.dispose()); this.targets.forEach(target => target.dispose());
    [this.image, this.distortion, this.kaleidoscope, this.rgb, this.led, this.edges, this.fracture, this.dither, this.interference, this.ascii, this.hex, this.stutter, this.topography, this.crt, this.stipple, this.tunnel, this.etch, this.tessera, this.fenestra, this.intarsia, this.crystal, this.mirrorgrain, this.copy].forEach(material => material?.dispose());
    this.quad.geometry.dispose(); this.renderer.dispose();
  }
}
