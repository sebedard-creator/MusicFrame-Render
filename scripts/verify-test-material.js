import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { renderVideo } from '../server/render.js';
import { presets } from '../public/presets.js';

// A short acceptance render from the imported user session. No source files change.
const baseUrl = 'http://127.0.0.1:5180';
const projects = await (await fetch(`${baseUrl}/api/projects`)).json();
const project = projects.find(item => item.audioName === '01.Second Bad Vilbel.mp3');
if (!project || project.status !== 'ready') throw new Error('La session de test doit être prête.');
const stored = JSON.parse(await readFile(path.resolve('data/projects', project.id, 'project.json'), 'utf8'));
const selectedPreset = process.argv[2] || project.config.preset;
if (!presets[selectedPreset]) throw new Error('Modèle de test inconnu.');
const config = { ...project.config, ...presets[selectedPreset], preset: selectedPreset, imageSeconds: 3, fps: 30 };
const job = {};
const suffix = selectedPreset === 'pulse' ? '' : `-${selectedPreset}`;
const output = path.resolve(`test-output/second-bad-vilbel${suffix}-test-1080p.mp4`);
const progress = setInterval(() => console.log(`${job.status}: ${job.frames || 0}/${job.totalFrames || 180}`), 15000);
try {
  const result = await renderVideo({
    job, project: { ...project, audio: { ...project.audio, duration: 6 }, audioPath: stored.audioPath },
    config, output, baseUrl,
  });
  const report = { sourceProject: project.id, sourceDuration: project.audio.duration, sourceImages: project.images.length, testDuration: 6, config, result, output };
  await writeFile(path.resolve(`test-output/real-material${suffix}-verification.json`), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { clearInterval(progress); }
