import { open, unlink } from 'node:fs/promises';
import {pcmReader} from './pcm-reader.js';
import path from 'node:path';
import FFT from 'fft.js';

// Dedicated, absolute dBFS magnitudes; existing photo-effect analysis is untouched.
export async function analyzeStereoSpectrum(audioPath, directory, duration, command, ffmpeg, packed=false,signal) {
  const file = path.join(directory, 'stereo-spectrum.pcm');
  let reader,binary;
  try {
    await command(ffmpeg, ['-v', 'error', '-y', '-i', audioPath, '-vn', '-ac', '2', '-ar', '48000', '-f', 'f32le', file]);
    reader=await pcmReader(file);
    if(packed)binary=await open(path.join(directory,'analyzer.bin'),'w');
    const batch=Buffer.alloc(1800*320);let used=0;
    const size = 4096, sampleRate = 48000, fps = 60, bands = 160;
    const fft = new FFT(size), output = fft.createComplexArray(), window = new Float64Array(size);
    const hann = Float64Array.from({ length: size }, (_, i) => .5 - .5 * Math.cos(2 * Math.PI * i / (size - 1)));
    const ranges = Array.from({ length: bands }, (_, i) => {
      const low = 30 * (20000 / 30) ** (i / bands), high = 30 * (20000 / 30) ** ((i + 1) / bands);
      return [Math.max(1, Math.floor(low * size / sampleRate)), Math.min(size / 2, Math.max(Math.floor(low * size / sampleRate) + 1, Math.ceil(high * size / sampleRate)))];
    });
    const frames = [];
    for (let frame = 0; frame < Math.ceil(duration * fps); frame++) {
      signal?.throwIfAborted();
      const start = Math.floor(frame * sampleRate / fps) - size / 2, channels = [];
      const sample=await reader.window(start*2,size*2);
      for (let channel = 0; channel < 2; channel++) {
        for (let i = 0; i < size; i++) window[i] = sample((start+i)*2+channel) * hann[i];
        fft.realTransform(output, window);
        const values = Uint8Array.from(ranges, ([lo, hi]) => {
          let power = 0;
          for (let bin = lo; bin < hi; bin++) power = Math.max(power, output[bin * 2] ** 2 + output[bin * 2 + 1] ** 2);
          const db = 20 * Math.log10(Math.max(1e-12, Math.sqrt(power) * 4 / (size - 1)));
          return Math.round(Math.max(0, Math.min(1, (db + 90) / 90)) * 255);
        });
        if(packed){batch.set(values,used);used+=bands;}else channels.push(Buffer.from(values).toString('base64'));
      }
      if(!packed)frames.push(channels);
      if(packed&&(used===batch.length||frame===Math.ceil(duration*fps)-1)){await binary.write(batch.subarray(0,used));used=0;}
    }
    return { version: packed?2:1, fps, bands, minHz: 30, maxHz: 20000, sampleRate, fftSize: size, minDb: -90, maxDb: 0, encoding: packed?'binary-u8-stereo':'base64-u8-stereo',...(packed?{count:Math.ceil(duration*fps),file:'analyzer.bin'}:{frames}) };
  } finally { await reader?.close();await binary?.close();await unlink(file).catch(() => {}); }
}
