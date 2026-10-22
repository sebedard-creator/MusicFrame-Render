// Adapted from Granulator.prepare/render: willbearfruits, MIT, copyright 2026.
// See vendor/granulator/granular.py and LICENSE. Counter-based random values
// replace NumPy's RNG so a seek can regenerate only the currently living grains.
function random(index, channel) {
  let n = (Math.imul(index + 4242, 374761393) + Math.imul(channel + 1, 668265263)) >>> 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

export function activeGrains(time, density, duration, region) {
  const grains = [];
  // Stratified onsets, variable lifetimes and Hann envelopes follow the source.
  const first = Math.max(0, Math.floor((time - duration * 1.3) * density) - 1);
  const last = Math.floor(time * density);
  for (let index = first; index <= last; index++) {
    const onset = (index + random(index, 0)) / density;
    const dur = duration * (.7 + .6 * random(index, 1));
    if (time < onset || time >= onset + dur) continue;
    const phase = (time - onset) / dur;
    const alpha = .5 - .5 * Math.cos(2 * Math.PI * phase);
    if (alpha <= .01) continue;
    grains.push({ index, phase, alpha,
      x: random(index, 2) * (1 - region), y: random(index, 3) * (1 - region),
      dx: random(index, 4) * 2 - 1, dy: random(index, 5) * 2 - 1,
      scale: .75 + random(index, 6) * .5, angle: random(index, 7) * 2 - 1,
    });
  }
  return grains;
}
