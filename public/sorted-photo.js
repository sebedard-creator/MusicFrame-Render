import * as THREE from 'three';
import { sortPixels } from './pixel-sort.js';

export class SortedPhotos {
  constructor() { this.cache = new Map(); }
  texture(image, config) {
    const key = [image.src, config.sortThreshold, config.sortLength, config.sortDirection, config.sortReverse].join(':');
    if (this.cache.has(key)) return this.cache.get(key);
    const ratio = Math.min(1, 1920 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * ratio)); canvas.height = Math.max(1, Math.round(image.height * ratio));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    pixels.data.set(sortPixels(pixels.data, canvas.width, canvas.height, {
      threshold: config.sortThreshold ?? .12, length: config.sortLength ?? .5,
      direction: config.sortDirection ?? 1, reverse: config.sortReverse ?? 0,
    }));
    context.putImageData(pixels, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.NoColorSpace; texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter;
    this.cache.set(key, texture);
    if (this.cache.size > 2) { const oldest = this.cache.keys().next().value; this.cache.get(oldest).dispose(); this.cache.delete(oldest); }
    return texture;
  }
  dispose() { this.cache.forEach(texture => texture.dispose()); }
}
