import * as THREE from 'three';

// Original 5x7 bitmap drawings; no font file or browser font is required.
// Tonal character ramp follows Ditherer ASCII (MIT), see vendor/ditherer/ascii.ts.
const glyphs = [
  ['00000','00000','00000','00000','00000','00000','00000'],
  ['00000','00000','00000','00000','00000','00100','00100'],
  ['00000','00100','00100','00000','00100','00100','00000'],
  ['00000','00000','00000','11111','00000','00000','00000'],
  ['00000','00000','11111','00000','11111','00000','00000'],
  ['00000','00100','00100','11111','00100','00100','00000'],
  ['00000','10101','01110','11111','01110','10101','00000'],
  ['01010','01010','11111','01010','11111','01010','01010'],
  ['11001','11010','00100','01000','10110','00110','00000'],
  ['01110','10001','10111','10101','10111','10000','01111'],
];

export function createAsciiAtlas() {
  const width = 80, height = 12, data = new Uint8Array(width * height * 4);
  glyphs.forEach((rows, glyph) => rows.forEach((row, y) => [...row].forEach((pixel, x) => {
    const index = ((y + 2) * width + glyph * 8 + x + 1) * 4;
    data[index] = data[index + 1] = data[index + 2] = pixel === '1' ? 255 : 0; data[index + 3] = 255;
  })));
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false; texture.needsUpdate = true;
  return texture;
}
