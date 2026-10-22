// Finite onset-triggered waves, sampled in audio time without render history.
export function samplePulseWaves(track, time, speed = 1, sensitivity = 1) {
  const radii = new Float32Array(8), gains = new Float32Array(8);
  const events = track.events;
  let low = 0, high = events.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (events[middle].time <= time) low = middle + 1; else high = middle;
  }
  const lifetime = 1.7 / speed;
  let slot = 0;
  for (let i = low - 1; i >= 0 && slot < 8; i--) {
    const age = time - events[i].time;
    if (age >= lifetime) break;
    radii[slot] = age * speed * .8;
    gains[slot] = Math.min(1.5, events[i].strength * sensitivity) * (1 - age / lifetime) ** 2;
    slot++;
  }
  return { radii, gains };
}
