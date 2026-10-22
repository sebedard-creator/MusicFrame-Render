import { applyNoiseFloor, applySmoothing, updatePeaks, peakToUint8, aggregateBins, aggregatePeaks } from './vendor/fft-visualizer/processing.js';

export function decodeStereoSpectrum(spectrum) {
  if (spectrum?.version !== 1 || ![80, 160].includes(spectrum.bands) || !spectrum.frames?.length) throw new Error('Analyse Stereo glow manquante. Réimporte le MP3 pour préparer son spectre stéréo.');
  return spectrum.frames.map(pair => pair.map(encoded => Uint8Array.from(atob(encoded), c => c.charCodeAt(0))));
}

// Build once per setting change, at the analysis clock (60 Hz), never at preview FPS.
export function processStereoTrack(rawFrames, config) {
  const sourceBands = rawFrames[0]?.[0]?.length || 80;
  const smoothed = [new Float32Array(sourceBands), new Float32Array(sourceBands)], peaks = [new Float32Array(sourceBands), new Float32Array(sourceBands)];
  const bands = config.glowBands ?? 80, frames = [];
  if (bands > sourceBands) throw new Error('Réimporte le MP3 pour préparer une analyse à 160 bandes.');
  for (const raw of rawFrames) {
    frames.push(raw.map((channel, ch) => {
      const data = Uint8Array.from(channel, v => Math.min(255, Math.round(v * (config.glowGain ?? 1))));
      applyNoiseFloor(data, config.glowFloor ?? 65);
      applySmoothing(data, smoothed[ch], config.glowSmoothing ?? .65);
      updatePeaks(peaks[ch], data, config.glowPeakDrop ?? .99);
      return { data: aggregateBins(data, bands), peaks: peakToUint8(aggregatePeaks(peaks[ch], bands), bands) };
    }));
  }
  return frames;
}

export function sampleStereoTrack(frames, fps, time, bands) {
  const position = Math.max(0, Math.min(frames.length - 1, time * fps)), index = Math.floor(position), mix = position - index;
  return interpolateStereo(frames[index], frames[Math.min(index + 1, frames.length - 1)], mix, bands);
}

function interpolateStereo(first, second, mix, bands) {
  return [0, 1].map(ch => {
    const a = first[ch], b = second[ch];
    return { data: Uint8Array.from({ length: bands }, (_, i) => Math.round(a.data[i] * (1 - mix) + b.data[i] * mix)), peaks: Uint8Array.from({ length: bands }, (_, i) => Math.round(a.peaks[i] * (1 - mix) + b.peaks[i] * mix)) };
  });
}

// Interactive tuning: decode only the needed neighborhood and advance at audio time.
// Bound the discarded history's contribution below .01/255 (sub-byte display error).
// Offline exports continue to use the complete processStereoTrack above.
export class LightweightStereoSampler {
  constructor(source) {
    if (source?.version !== 1 || ![80, 160].includes(source.bands) || !source.frames?.length) throw new Error('Analyse Stereo glow manquante. Réimporte le MP3 pour préparer son spectre stéréo.');
    this.source = source; this.raw = new Map(); this.frames = new Map(); this.lastIndex = -1; this.processedFrames = 0;
  }
  decode(index) {
    if (!this.raw.has(index)) {
      this.raw.set(index, this.source.frames[index].map(encoded => Uint8Array.from(atob(encoded), c => c.charCodeAt(0))));
      if (this.raw.size > 2048) this.raw.delete(this.raw.keys().next().value);
    }
    return this.raw.get(index);
  }
  sample(time, config) {
    const bands = config.glowBands ?? 80, gain = config.glowGain ?? 1, floor = config.glowFloor ?? 65;
    const smoothing = config.glowSmoothing ?? .65, showPeaks = !!config.glowPeaks, decay = config.glowPeakDrop ?? .99;
    if (bands > this.source.bands) throw new Error('Réimporte le MP3 pour préparer une analyse à 160 bandes.');
    const key = [bands, gain, floor, smoothing, showPeaks, showPeaks ? decay : 0].join(':');
    const position = Math.max(0, Math.min(this.source.frames.length - 1, time * this.source.fps));
    const index = Math.floor(position), next = Math.min(index + 1, this.source.frames.length - 1);
    const historyFor = factor => factor > 0 ? Math.ceil(Math.log(.01 / 255) / Math.log(factor)) : 0;
    const history = Math.max(2, historyFor(smoothing), showPeaks ? historyFor(decay) : 0);
    const reset = key !== this.key || index < this.lastIndex - 2 || index > this.lastIndex + history;
    if (reset) {
      this.key = key; this.frames.clear(); this.lastIndex = Math.max(0, index - history) - 1;
      this.smoothed = [new Float32Array(this.source.bands), new Float32Array(this.source.bands)]; this.peaks = [new Float32Array(this.source.bands), new Float32Array(this.source.bands)];
    }
    for (let frame = this.lastIndex + 1; frame <= next; frame++) {
      const output = this.decode(frame).map((channel, ch) => {
        const data = Uint8Array.from(channel, v => Math.min(255, Math.round(v * gain)));
        applyNoiseFloor(data, floor); applySmoothing(data, this.smoothed[ch], smoothing);
        if (showPeaks) updatePeaks(this.peaks[ch], data, decay);
        return { data: aggregateBins(data, bands), peaks: peakToUint8(aggregatePeaks(this.peaks[ch], bands), bands) };
      });
      this.frames.set(frame, output); this.lastIndex = frame; this.processedFrames++;
      if (this.frames.size > 4) this.frames.delete(this.frames.keys().next().value);
    }
    return interpolateStereo(this.frames.get(index), this.frames.get(next), position - index, bands);
  }
}
