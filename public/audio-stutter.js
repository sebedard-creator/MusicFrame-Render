import {reactionGain} from './audio-response.js';
// MusicFrame Render: seekable bursts of repeated framing, derived from MP3 onsets.
export function sampleStutter(track, time, sensitivity = 1, duration = .32, repeats = 3,mode='legacy') {
  const events = track.events;
  let low = 0, high = events.length;
  while (low < high) { const middle = (low + high) >>> 1; if (events[middle].time <= time) low = middle + 1; else high = middle; }
  for (let i = low - 1; i >= 0; i--) {
    const event = events[i], age = time - event.time;
    if (age >= duration) break;
    const strength = reactionGain(event.strength,sensitivity,mode);
    if (strength < .12) continue;
    const position = age / duration * repeats;
    const step = Math.floor(position), phase = position - step;
    const envelope = Math.pow(1 - age / duration, 1.2);
    return { impact: strength * envelope * (1 - phase) ** 2, pattern: event.pattern, step };
  }
  return { impact: 0, pattern: 0, step: 0 };
}
