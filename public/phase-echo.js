import * as THREE from 'three';

// Camera oscillators, feedback offsets and screen composition adapted from
// phase-viz ImageFXVisualizer.tsx, MIT, Copyright 2026 Nagisa Dozono.
// Finite MP3-timed history, controls and colour trails: MusicFrame Render.
export class PhaseEcho {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.NoColorSpace; this.texture.generateMipmaps = false;
    this.texture.minFilter = THREE.LinearFilter; this.texture.magFilter = THREE.LinearFilter;
  }
  draw(image, config, time, sampleFrame, width, height) {
    const canvas = this.canvas;
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    const ctx = canvas.getContext('2d', { alpha: false });
    const current = sampleFrame(time);
    const count = config.echoCount ?? 6, delay = config.echoDelay ?? .075, decay = config.echoDecay ?? .78;
    const spread = config.echoSpread ?? .65, mix = config.echoMix ?? .7, chroma = config.echoChroma ?? .8;
    const strength = config.intensity * (config.echoReaction ?? 1);
    const photoStart = Math.floor(time / config.imageSeconds) * config.imageSeconds;
    const framePose = (sampleTime, frame) => {
      const t = sampleTime * config.speed;
      const motion = (frame.impact * .014 + frame.bass * .006) * spread * strength * 4;
      return {
        x: (Math.sin(t * 19.3) + Math.sin(t * 7.7) * .45) * width * motion,
        y: (Math.cos(t * 17.1) + Math.sin(t * 6.1) * .4) * height * motion,
        zoom: 1 + config.zoom * config.intensity * (.035 + frame.bass * .13),
      };
    };
    const drawPhoto = (pose, extraX = 0, extraY = 0) => {
      const scale = (config.fit === 'contain' ? Math.min(width / image.width, height / image.height) : Math.max(width / image.width, height / image.height)) * pose.zoom;
      const w = image.width * scale, h = image.height * scale;
      ctx.drawImage(image, (width - w) / 2 + pose.x + extraX, (height - h) / 2 + pose.y + extraY, w, h);
    };
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.filter = 'none';
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, width, height);
    const pose = framePose(time, current);
    drawPhoto({ ...pose, x: pose.x * .25, y: pose.y * .25 });
    let totalWeight = 0;
    for (let i = 1; i <= count; i++) totalWeight += decay ** (i - 1);
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (let i = count; i >= 1; i--) {
      const pastTime = time - i * delay;
      if (pastTime < photoStart) continue;
      const frame = sampleFrame(pastTime);
      const beat = Math.min(1.5, Math.max(frame.bass, frame.impact, frame.volume * .8));
      const weight = decay ** (i - 1) / totalWeight;
      ctx.globalAlpha = Math.min(1, mix * strength * beat * weight * 1.5);
      if (ctx.globalAlpha <= .0001) continue;
      ctx.filter = chroma > .001 ? `sepia(${chroma}) saturate(${1 + chroma * 5}) hue-rotate(${i % 2 ? 145 : 290}deg)` : 'none';
      const t = pastTime * config.speed;
      const shiftX = Math.sin(t * 3.1 + frame.mid * 4) * width * (.004 + mix * .006);
      const shiftY = Math.cos(t * 2.4 + frame.high * 3) * height * (.003 + mix * .004);
      drawPhoto(framePose(pastTime, frame), shiftX * i * spread * strength, shiftY * i * spread * strength);
    }
    ctx.restore();
    this.texture.needsUpdate = true;
    return this.texture;
  }
  dispose() { this.texture.dispose(); }
}
