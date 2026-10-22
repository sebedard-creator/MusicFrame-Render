import * as THREE from 'three';

// Targeted Canvas2D port of phase-viz ImageFXVisualizer.tsx: distorted strips,
// block/glitch datamosh and RGB screen overlays. MIT, Copyright 2026 Nagisa Dozono.
// Original at vendor/phase-viz. Local audio/time, controls and fit: MusicFrame Render.
export class PhaseImage {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.source = document.createElement('canvas');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.NoColorSpace; this.texture.generateMipmaps = false;
    this.texture.minFilter = THREE.LinearFilter; this.texture.magFilter = THREE.LinearFilter;
  }
  draw(image, config, time, bands, transient, width, height) {
    const canvas = this.canvas, source = this.source;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = source.width = width; canvas.height = source.height = height;
    }
    const ctx = canvas.getContext('2d', { alpha: false });
    const base = source.getContext('2d', { alpha: false });
    const [volume, bass, mid, high] = bands;
    const strength = config.intensity;
    const reaction = (config.phaseReaction ?? 1) * strength;
    const drive = Math.min(1.5, Math.max(volume, bass * .8, transient)) * reaction;
    const t = time * config.speed;
    const seed = Math.floor(t * 30) * 131;
    const hash = index => { const n = Math.sin((seed + index * 17) * 12.9898) * 43758.5453; return n - Math.floor(n); };
    base.fillStyle = '#000'; base.fillRect(0, 0, width, height);
    const zoom = 1 + config.zoom * strength * (.035 + bass * .13);
    const scale = (config.fit === 'contain' ? Math.min(width / image.width, height / image.height) : Math.max(width / image.width, height / image.height)) * zoom;
    const w = image.width * scale, h = image.height * scale;
    base.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.drawImage(source, 0, 0);
    const shift = config.phaseShift ?? .75;
    const sliceAmount = (config.phaseSlices ?? .55) * drive;
    if (sliceAmount > .001) {
      ctx.save(); ctx.globalAlpha = Math.min(.8, sliceAmount * .9);
      const strips = 34, stripH = Math.ceil(height / strips) + 1;
      for (let i = 0; i < strips; i++) {
        const y = i / strips * height, sh = Math.min(stripH, height - y);
        const band = i < 8 ? bass : i < 22 ? mid : high;
        const offset = (Math.sin(t * 4.5 + i * 1.73) * .5 + Math.sin(t * 13.1 + i * .37) * transient + (band - .5) * mid) * sliceAmount * width * .07 * shift;
        ctx.drawImage(source, 0, y, width, sh, offset, y, width, sh);
      }
      ctx.restore();
    }
    const blockAmount = (config.phaseBlocks ?? .65) * drive;
    if (blockAmount > .001) {
      const count = Math.min(64, Math.floor(10 + bass * 18 + mid * 12));
      const minSize = Math.max(4, Math.min(width, height) * .026), maxSize = Math.min(width, height) * .105;
      ctx.save(); ctx.globalAlpha = Math.min(.9, (.22 + transient * .4) * blockAmount * 2);
      for (let i = 0; i < count; i++) {
        const bw = minSize + hash(i * 9 + 2) * (maxSize - minSize);
        const bh = bw * (.55 + hash(i * 9 + 3) * 1.15);
        const sx = hash(i * 9 + 4) * Math.max(1, width - bw), sy = hash(i * 9 + 5) * Math.max(1, height - bh);
        const band = i % 3 === 0 ? bass : i % 3 === 1 ? mid : high;
        const dx = sx + (hash(i * 9 + 6) - .5) * width * (.035 + band * .05) * shift * drive;
        const dy = sy + (hash(i * 9 + 7) - .5) * height * (.02 + transient * .035) * shift * drive;
        ctx.drawImage(source, sx, sy, bw, bh, dx, dy, bw, bh);
      }
      ctx.restore();
    }
    const chroma = (config.phaseChroma ?? .4) * drive;
    if (chroma > .001) {
      const offsetX = chroma * width * .014;
      const offsetY = Math.sin(t * 4.3) * chroma * height * .004;
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = Math.min(.45, chroma * .3);
      ctx.filter = 'sepia(1) saturate(2.4) hue-rotate(295deg)'; ctx.drawImage(source, offsetX, offsetY);
      ctx.filter = 'sepia(1) saturate(2.1) hue-rotate(135deg)'; ctx.drawImage(source, -offsetX * .9, -offsetY);
      ctx.restore();
    }
    const noise = (config.phaseNoise ?? .15) * drive;
    if (noise > .001) {
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 18; i++) {
        ctx.globalAlpha = Math.min(1, noise * (.18 + hash(i * 31) * .28));
        ctx.fillStyle = i % 3 === 0 ? '#00e5ee' : i % 3 === 1 ? '#ff40a0' : '#fff';
        ctx.fillRect(hash(i * 31 + 3) * width, hash(i * 31 + 4) * height, width * (.02 + hash(i * 31 + 1) * .18), Math.max(1, height * (.002 + hash(i * 31 + 2) * .008)));
      }
      ctx.restore();
    }
    this.texture.needsUpdate = true;
    return this.texture;
  }
  dispose() { this.texture.dispose(); }
}
