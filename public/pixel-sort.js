// Gated runs, row/column traversal and luminance sorting adapted from
// gyng/ditherer pixelsort.ts, MIT. Copyright 2026 Ng Guoyou, contributors.
// See vendor/ditherer/LICENSE and pixelsort.ts for the original source.
export function sortPixels(source, width, height, { threshold = .12, length = .5, direction = 1, reverse = 0 } = {}) {
  const output = new Uint8ClampedArray(source);
  const luma = i => (.2126 * source[i] + .7152 * source[i + 1] + .0722 * source[i + 2]) / 255;
  const lineLength = direction === 1 ? height : width;
  const lineCount = direction === 1 ? width : height;
  const limit = Math.max(2, Math.round(lineLength * length));
  for (let line = 0; line < lineCount; line++) {
    let trail = [];
    const flush = () => {
      const ordered = [...trail].sort((a, b) => (luma(a) - luma(b)) * (reverse ? -1 : 1));
      for (let n = 0; n < trail.length; n++) for (let channel = 0; channel < 4; channel++) output[trail[n] + channel] = source[ordered[n] + channel];
      trail = [];
    };
    for (let position = 0; position < lineLength; position++) {
      const index = (direction === 1 ? position * width + line : line * width + position) * 4;
      const light = luma(index);
      if (light >= threshold && light <= .98 && source[index + 3] > 0) {
        trail.push(index);
        if (trail.length >= limit) flush();
      } else if (trail.length) flush();
    }
    if (trail.length) flush();
  }
  return output;
}
