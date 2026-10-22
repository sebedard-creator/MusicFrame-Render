// Raw interleaved byte-stream DSP adapted from gyng/ditherer dataBend.ts.
// MIT, Copyright 2026 Ng Guoyou, contributors. Original + license in vendor/ditherer.
export function bendBytes(source, { mode = 3, offset = 257, intensity = .8 } = {}) {
  const output = new Uint8ClampedArray(source);
  const n = output.length;
  const clamp = value => Math.max(0, Math.min(255, Math.round(value)));
  if (mode === 0) {
    for (let i = offset; i < n; i++) output[i] = clamp(source[i] + (source[i - offset] - 128) * intensity);
  } else if (mode === 1) {
    const accumulator = new Float32Array(source);
    for (let echo = 1; echo <= 5; echo++) {
      const delay = offset * echo;
      const decay = intensity * .6 ** echo;
      if (delay >= n) break;
      for (let i = delay; i < n; i++) accumulator[i] += (source[i - delay] - 128) * decay;
    }
    for (let i = 0; i < n; i++) output[i] = clamp(accumulator[i]);
  } else if (mode === 2) {
    const bits = Math.max(1, Math.round(8 - intensity * 6));
    const step = 2 ** (8 - bits);
    for (let i = 0; i < n; i++) output[i] = Math.min(255, Math.round(source[i] / step) * step);
    const sampleBytes = Math.max(1, Math.round(offset / 10));
    for (let i = 0; i < n; i++) output[i] = output[Math.floor(i / sampleBytes) * sampleBytes];
  } else if (mode === 3) {
    const chunk = Math.max(2, offset);
    for (let start = 0; start < n; start += chunk * 2) {
      const end = Math.min(start + chunk, n);
      for (let i = start, j = end - 1; i < j; i++, j--) [output[i], output[j]] = [output[j], output[i]];
    }
  }
  for (let i = 3; i < n; i += 4) output[i] = source[i];
  return output;
}
