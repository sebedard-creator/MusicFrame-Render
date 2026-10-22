import * as THREE from 'three';

// Column sampling/stretching adapted from phase-viz drawMeltDatamosh in
// ImageFXVisualizer.tsx, MIT, Copyright 2026 Nagisa Dozono.
// Quantized motion, directions, local audio and controls: MusicFrame Render.
export class PhaseRibbons {
  constructor() {
    this.canvas = document.createElement('canvas'); this.source = document.createElement('canvas');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.NoColorSpace; this.texture.generateMipmaps = false;
    this.texture.minFilter = THREE.LinearFilter; this.texture.magFilter = THREE.LinearFilter;
  }
  draw(image, config, time, bands, width, height) {
    const canvas = this.canvas, source = this.source;
    if (canvas.width !== width || canvas.height !== height) { canvas.width = source.width = width; canvas.height = source.height = height; }
    const ctx = canvas.getContext('2d', { alpha: false }), base = source.getContext('2d', { alpha: false });
    const [volume, bass, mid, high] = bands;
    const strength = config.intensity;
    const drive = Math.min(1.5, Math.max(volume, bass)) * (config.ribbonReaction ?? 1) * strength;
    const count = config.ribbonCount ?? 48, columnWidth = width / count;
    const stretch = config.ribbonStretch ?? .85, driftAmount = config.ribbonDrift ?? .3;
    const t = Math.floor(time * config.speed * 12) / 12;
    const zoom = 1 + config.zoom * strength * (.035 + bass * .13);
    const scale = (config.fit === 'contain' ? Math.min(width / image.width, height / image.height) : Math.max(width / image.width, height / image.height)) * zoom;
    const w = image.width * scale, h = image.height * scale;
    base.fillStyle = '#000'; base.fillRect(0, 0, width, height);
    base.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.drawImage(source, 0, 0);
    if (drive > .001) {
      ctx.save(); ctx.globalAlpha = config.ribbonMix ?? 1;
      for (let i = 0; i < count; i++) {
        const x = i * columnWidth, sw = Math.min(columnWidth + .5, width - x);
        const p = i / Math.max(1, count - 1) * 2;
        const energy = p < 1 ? bass + (mid - bass) * p : mid + (high - mid) * (p - 1);
        const pull = (.025 + energy * .09 + bass * .04) * height * stretch * drive * 3;
        const drift = Math.sin(t * 1.8 + i * .7) * columnWidth * .55 * driftAmount * drive;
        const sy = Math.max(0, Math.sin(t * .9 + i) * height * .025 * Math.min(1, drive));
        const direction = config.ribbonDirection ?? 2;
        const upward = direction === 1 || direction === 2 && i % 2 === 1;
        const dy = upward ? sy - pull * 1.18 : sy + pull * .18;
        ctx.drawImage(source, x, sy, sw, height - sy, x + drift, dy, sw, height - sy + pull);
      }
      ctx.restore();
    }
    this.texture.needsUpdate = true;
    return this.texture;
  }
  dispose() { this.texture.dispose(); }
}
