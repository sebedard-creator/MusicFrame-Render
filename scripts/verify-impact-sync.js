import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { renderVideo } from '../server/render.js';
import { command, ffmpeg } from '../server/media.js';
import { buildImpactTrack, sampleImpact } from '../public/audio-impacts.js';

const baseUrl = 'http://127.0.0.1:5180';
const reference = await (await fetch(`${baseUrl}/api/reference`)).json();
const project = reference.project;
const status = await (await fetch(`${baseUrl}/api/status`)).json();
const config = { ...status.defaults, ...project.config, preset: 'fracture', fps: 30 };
const stored = JSON.parse(await readFile(path.resolve('data/projects', project.id, 'project.json'), 'utf8'));
const analysis = await (await fetch(`${baseUrl}${project.analysisUrl}`)).json();
const impacts = buildImpactTrack(analysis);
const startTime = 24; const duration = 6;
const output = path.resolve('test-output/fracture-impacts-24s-1080p.mp4');
const job = {};
const progress = setInterval(() => console.log(`${job.status}: ${job.frames || 0}/${job.totalFrames || duration * config.fps}`), 15000);
let result;
try {
  result = await renderVideo({ job, project: { ...project, audio: { ...project.audio, duration }, audioPath: stored.audioPath }, config, output, baseUrl, startTime });
} finally { clearInterval(progress); }
// The same photo remains on screen: deviations from a quiet frame should coincide with impacts.
const raw = await command(ffmpeg, ['-v', 'error', '-i', output, '-an', '-vf', 'scale=80:45', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1']);
const frameBytes = 80 * 45 * 3; const points = [];
for (let frame = 0; frame < Math.floor(raw.length / frameBytes); frame++) {
  const { impact } = sampleImpact(impacts, startTime + frame / config.fps, config.sensitivity, config.glitchAttack, config.glitchRelease);
  let deviation = 0;
  for (let i = 0; i < frameBytes; i++) deviation += Math.abs(raw[frame * frameBytes + i] - raw[i]);
  points.push({ time: startTime + frame / config.fps, impact, deviation: deviation / frameBytes });
}
const quiet = points.filter(point => point.impact < .0001); const hits = points.filter(point => point.impact > .65);
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const meanQuietDifference = mean(quiet.map(point => point.deviation)); const meanHitDifference = mean(hits.map(point => point.deviation));
assert.ok(quiet.length > 5 && hits.length > 5, 'The excerpt must contain both hits and quiet intervals.');
assert.ok(meanHitDifference > meanQuietDifference * 4 + 1, 'Visible photo changes must coincide with the detected audio impacts.');
const report = { output, sourceProject: project.id, startTime, duration, config, result, quietFrames: quiet.length, hitFrames: hits.length, meanQuietDifference, meanHitDifference, points };
await writeFile(path.resolve('test-output/impact-sync-verification.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ output, config, result, quietFrames: quiet.length, hitFrames: hits.length, meanQuietDifference, meanHitDifference }, null, 2));
