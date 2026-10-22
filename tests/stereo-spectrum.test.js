import test from 'node:test';
import assert from 'node:assert/strict';
import { validateConfig } from '../server/config.js';
import { decodeStereoSpectrum, processStereoTrack, sampleStereoTrack, LightweightStereoSampler } from '../public/stereo-spectrum.js';
import { presets, photoModelIds } from '../public/presets.js';

test('Stereo glow validates its layout and retains the accepted server settings', () => {
  const config = validateConfig({ ...presets.stereoGlow, preset: 'stereoGlow' });
  assert.equal(config.glowSpace, 0); assert.equal(config.glowFloor, 27); assert.equal(config.glowSmoothing, .21);
  assert.equal(config.glowBands, 80); assert.equal(config.glowPeaks, 0); assert.equal(config.glowStereo, 0);assert.equal(config.glowOpacity,.57);
  for (const input of [{ glowBands: 30 }, { glowRotation: 45 }, { glowStereo: .5 }, { glowFloor: 255 }, { glowOpacity: NaN }, { glowPhoto: photoModelIds.length + 1 }, { glowSmoothing: 1 }]) assert.throws(() => validateConfig(input));
});

test('Light tuning samples a bounded neighborhood, follows seeks and matches full processing within one byte', () => {
  const source = { version: 1, fps: 60, bands: 80, frames: Array.from({ length: 1800 }, (_, frame) => [0, 1].map(ch => Buffer.from(Uint8Array.from({ length: 80 }, (_, band) => frame < 250 || frame > 850 ? 0 : (frame * 31 + band * 17 + ch * 93) % 256)).toString('base64'))) };
  const sampler = new LightweightStereoSampler(source);
  for (const config of [presets.stereoGlow, { ...presets.stereoGlow, glowSmoothing: .95, glowPeaks: 1, glowPeakDrop: .99, glowBands: 20 }, { ...presets.stereoGlow, glowFloor: 27, glowSmoothing: .21, glowGain: 1.2, glowStereo: 0 }]) {
    const full = processStereoTrack(decodeStereoSpectrum(source), config);
    for (const time of [0, 9.15, 9.18, 9.2, 27, 12.45, 12.46, 0, 27]) {
      const expected = sampleStereoTrack(full, 60, time, config.glowBands), actual = sampler.sample(time, config);
      for (let ch = 0; ch < 2; ch++) for (let bin = 0; bin < config.glowBands; bin++) {
        assert.ok(Math.abs(expected[ch].data[bin] - actual[ch].data[bin]) <= 1);
        if (config.glowPeaks) assert.ok(Math.abs(expected[ch].peaks[bin] - actual[ch].peaks[bin]) <= 1);
      }
    }
  }
  const quick = new LightweightStereoSampler(source);
  const quickConfig = { ...presets.stereoGlow, glowSmoothing: .21, glowPeaks: 0 };
  quick.sample(25, quickConfig);
  assert.ok(quick.processedFrames < 20, 'A late seek must not replay the complete song.');
  const before = quick.processedFrames;
  quick.sample(25 + 1 / 30, quickConfig);
  assert.ok(quick.processedFrames - before <= 3, 'Playback should advance only newly reached audio frames.');
});

test('Separate stereo tones, silence and seek-stable smoothing at the audio clock', () => {
  const left = new Uint8Array(80), right = new Uint8Array(80); left[20] = 240; right[45] = 220;
  const encoded = bytes => Buffer.from(bytes).toString('base64');
  const source = { version: 1, bands: 80, frames: Array.from({ length: 90 }, (_, i) => i < 30 ? [encoded(new Uint8Array(80)), encoded(new Uint8Array(80))] : [encoded(left), encoded(right)]) };
  const raw = decodeStereoSpectrum(source), config = presets.stereoGlow;
  const track = processStereoTrack(raw, config);
  assert.ok(sampleStereoTrack(track, 60, .2, 80).every(ch => ch.data.every(v => v === 0)));
  const point = sampleStereoTrack(track, 60, 1, 80);
  assert.ok(point[0].data[20] > 200); assert.equal(point[0].data[45], 0);
  assert.ok(point[1].data[45] > 190); assert.equal(point[1].data[20], 0);
  sampleStereoTrack(track, 60, 1.4, 80); sampleStereoTrack(track, 60, .3, 80);
  assert.deepEqual(sampleStereoTrack(track, 60, 1, 80), point);
  const output30 = Array.from({ length: 30 }, (_, i) => sampleStereoTrack(track, 60, i / 30, 80));
  const output60 = Array.from({ length: 60 }, (_, i) => sampleStereoTrack(track, 60, i / 60, 80));
  output30.forEach((frame, i) => assert.deepEqual(frame, output60[i * 2]));
  assert.throws(() => decodeStereoSpectrum(null), /Analyse/);
});

test('160 measured bands preserve adjacent treble detail and old 80-band analyses remain readable', () => {
  assert.equal(validateConfig({ glowBands: 160 }).glowBands, 160);
  const l = new Uint8Array(160), r = new Uint8Array(160); l[156] = 210; l[157] = 70; r[155] = 180;
  const source = { version: 1, bands: 160, fps: 60, frames: Array.from({ length: 30 }, () => [l, r].map(v => Buffer.from(v).toString('base64'))) };
  const config = { ...presets.stereoGlow, glowGain: 1, glowBands: 160, glowFloor: 0, glowSmoothing: 0, glowPeaks: 1 };
  const full = processStereoTrack(decodeStereoSpectrum(source), config);
  const actual = new LightweightStereoSampler(source).sample(.2, config);
  assert.deepEqual(actual, sampleStereoTrack(full, 60, .2, 160));
  assert.equal(actual[0].data.length, 160); assert.equal(actual[0].data[156], 210); assert.equal(actual[0].data[157], 70);
  assert.equal(actual[1].data[155], 180); assert.equal(actual[1].data[156], 0);
  const reduced = processStereoTrack(decodeStereoSpectrum(source), { ...config, glowBands: 80 });
  assert.equal(reduced[10][0].data[78], 210);
  const legacy = { ...source, bands: 80, frames: source.frames.map(pair => pair.map(v => Buffer.from(Buffer.from(v, 'base64').subarray(0, 80)).toString('base64'))) };
  assert.equal(new LightweightStereoSampler(legacy).sample(.2, { ...config, glowBands: 80 })[0].data.length, 80);
  assert.throws(() => new LightweightStereoSampler(legacy).sample(.2, config), /160 bandes/);
  assert.throws(() => processStereoTrack(decodeStereoSpectrum(legacy), config), /160 bandes/);
});
