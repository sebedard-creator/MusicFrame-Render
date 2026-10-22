import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { command, ffmpeg } from '../server/media.js';
import { buildImpactTrack } from '../public/audio-impacts.js';

const directory = 'data/projects/bd444c6f-de95-4682-94d3-adc398972204';
const analysis = JSON.parse(await readFile(path.join(directory, 'analysis.json'), 'utf8'));
const track = buildImpactTrack(analysis);
const start = 24; const duration = 6; const sampleRate = 24000;
const raw = await command(ffmpeg, ['-v', 'error', '-ss', String(start), '-i', path.join(directory, 'audio.mp3'), '-t', String(duration), '-vn', '-ac', '2', '-ar', String(sampleRate), '-f', 'f32le', 'pipe:1']);
const pcm = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
const hop = 120; const levels = [];
for (let at = 0; at < pcm.length; at += hop * 2) {
  let power = 0; for (let i = at; i < Math.min(pcm.length, at + hop * 2); i++) power += pcm[i] ** 2;
  levels.push(Math.sqrt(power / (hop * 2)));
}
const rows = track.events.filter(event => event.time >= start + .2 && event.time < start + duration && event.strength > .5).map(event => {
  let largest = 0; let onset = 0;
  const from = Math.max(2, Math.floor((event.time - start - .12) * sampleRate / hop));
  const until = Math.min(levels.length - 1, Math.ceil((event.time - start + .025) * sampleRate / hop));
  for (let i = from; i <= until; i++) {
    const rise = levels[i] - levels[i - 2]; if (rise > largest) { largest = rise; onset = start + i * hop / sampleRate; }
  }
  return { impact: event.time, waveformRise: onset, lagMs: Math.round((event.time - onset) * 1000) };
});
const report = { method: 'Approximate timing against the strongest positive 10 ms RMS rise in a 5 ms grid; not a client hardware latency measurement.', start, duration, rows };
await writeFile('test-output/impact-lag-measurement.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
