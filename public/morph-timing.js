// A finite transition ending at each shared photo boundary. Independent of FPS/seek.
export function morphProgress(time, imageSeconds, duration) {
  const phase = Math.max(0, time) % imageSeconds;
  const window = Math.min(duration, imageSeconds * .8);
  return Math.max(0, Math.min(1, (phase - imageSeconds + window) / window));
}
