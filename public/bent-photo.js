import * as THREE from 'three';
import { bendBytes } from './byte-bend.js';

// Cache the byte transform once per photo and setting; audio reveals it on the GPU.
export class BentPhotos {
  constructor() { this.cache = new Map(); }
  texture(image, config) {
    const key = [image.src, config.bendMode, config.bendOffset].join(':');
    if (this.cache.has(key)) return this.cache.get(key);
    const ratio = Math.min(1, 1920 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * ratio));
    canvas.height = Math.max(1, Math.round(image.height * ratio));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    pixels.data.set(bendBytes(pixels.data, { mode: config.bendMode ?? 3, offset: config.bendOffset ?? 257 }));
    context.putImageData(pixels, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.NoColorSpace; texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter;
    this.cache.set(key, texture);
    if (this.cache.size > 2) { const oldest = this.cache.keys().next().value; this.cache.get(oldest).dispose(); this.cache.delete(oldest); }
    return texture;
  }
  dispose() { this.cache.forEach(texture => texture.dispose()); this.cache.clear(); }
}
