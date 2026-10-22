import {reactionGain} from './audio-response.js';
// Derive a seekable transient timeline from the existing stereo-band analysis.
// No render history or wall clock is used, so preview and export agree.
export function buildImpactTrack(analysis) {
  const frames = analysis.frames; const fps = analysis.fps;
  const lag = Math.max(1, Math.round(fps * .05));
  const window = Math.max(1, Math.round(fps * .45));
  const flux = new Float64Array(frames.length); const thresholds = new Float64Array(frames.length);
  const weights = [.3, .6, .25, .15];
  let sum = 0;
  for (let i = 0; i < frames.length; i++) {
    const previous = frames[Math.max(0, i - lag)];
    for (let band = 0; band < 4; band++) flux[i] += Math.max(0, frames[i][band] - previous[band]) * weights[band];
    thresholds[i] = Math.max(.006, sum / Math.min(window, Math.max(1, i)) * 1.35);
    sum += flux[i]; if (i >= window) sum -= flux[i - window];
  }
  const events = []; const cooldown = Math.max(1, Math.round(fps * .09));
  for (let i = 1; i < flux.length - 1; i++) {
    if (flux[i] <= thresholds[i] || flux[i] <= flux[i - 1] || flux[i] < flux[i + 1]) continue;
    if (events.length && i - events.at(-1).frame < cooldown) continue;
    events.push({ frame: i, time: i / fps, strength: flux[i] });
  }
  const strengths = events.map(event => event.strength).sort((a, b) => a - b);
  const reference = Math.max(.025, strengths[Math.floor((strengths.length - 1) * .9)] || .025);
  for (let i = 0; i < events.length; i++) { events[i].strength = Math.min(1.5, events[i].strength / reference); events[i].pattern = i + 1; }
  return { events };
}

export function sampleImpact(track, time, sensitivity = 1, gain = 1.4, release = .18,mode='legacy') {
  const events = track.events;
  let low = 0; let high = events.length;
  while (low < high) { const middle = (low + high) >>> 1; if (events[middle].time <= time) low = middle + 1; else high = middle; }
  let impact = 0; let pattern = 0;
  for (let i = low - 1; i >= 0; i--) {
    const event = events[i]; const strength = event.strength * sensitivity * gain;
    if (!pattern && strength >= .12) pattern = event.pattern;
    const age = time - event.time;
    if (age >= release) break;
    if (strength >= .12) impact = Math.max(impact, reactionGain(event.strength,sensitivity*gain,mode) * Math.pow(Math.max(0, 1 - age / release), 1.5));
  }
  // Keep the last pattern stable after its envelope ends, including during silence.
  if (!pattern && low) pattern = events[low - 1].pattern;
  return { impact, pattern };
}
