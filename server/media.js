import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, writeFile, unlink,open } from 'node:fs/promises';
import {pcmReader} from './pcm-reader.js';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import yauzl from 'yauzl';
import sharp from 'sharp';
import FFT from 'fft.js';
import { analyzeStereoSpectrum } from './stereo-spectrum.js';
import { spectralRanges, spectrumMinHz, spectrumMaxHz } from '../public/spectrum.js';

export const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
export const ffprobe = process.env.FFPROBE_PATH || 'ffprobe';
export function command(executable, args, { maxBytes = 16 * 1024 * 1024,signal } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { windowsHide: true,signal });
    const chunks = []; let bytes = 0; let error = '';
    child.stdout.on('data', chunk => { bytes += chunk.length; if (bytes > maxBytes) child.kill(); else chunks.push(chunk); });
    child.stderr.on('data', chunk => { error = (error + chunk).slice(-4000); });
    child.on('error', reject);
    child.on('close', code => code === 0 && bytes <= maxBytes ? resolve(Buffer.concat(chunks)) : reject(new Error(error || 'File processing failed.')));
  });
}

export async function inspectAudio(file) {
  const metadata = JSON.parse(await command(ffprobe, ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', file]));
  const stream = metadata.streams.find(item => item.codec_type === 'audio');
  const duration = Number(metadata.format.duration);
  const format = metadata.format.format_name;
  if (!stream || !['mp3','wav'].includes(format) || (format==='mp3'&&stream.codec_name!=='mp3') || !Number.isFinite(duration) || duration <= 0 || duration > 43200) throw new Error('Choose a valid WAV or MP3 file, up to 12 hours long.');
  return { duration, channels: stream.channels, sampleRate: Number(stream.sample_rate), bitrate: Number(metadata.format.bit_rate) || 0, format };
}

export function assertZipEntry(entry, totals) {
  const name = entry.fileName.replaceAll('\\', '/');
  if (name.startsWith('/') || /^[a-z]:/i.test(name) || name.split('/').includes('..')) throw new Error('The ZIP contains an unsafe file path.');
  const type = (entry.externalFileAttributes >>> 16) & 0xf000;
  if (type === 0xa000 || entry.generalPurposeBitFlag & 1) throw new Error('Symbolic links and encrypted ZIP archives are not supported.');
  totals.entries++;
  totals.bytes += entry.uncompressedSize;
  if (totals.entries > 3000 || totals.bytes > 1024 * 1024 * 1024 || entry.uncompressedSize > 80 * 1024 * 1024) throw new Error('The ZIP exceeds the limits: 1 GB extracted, 80 MB per file.');
  return name;
}

async function normalizeImage(file, directory, index, originalName) {
  const input = sharp(file, { limitInputPixels: 64_000_000, animated: false });
  const metadata = await input.metadata();
  if (!['jpeg', 'png', 'webp'].includes(metadata.format)) throw new Error('Unsupported image format.');
  const filename = `${String(index).padStart(4, '0')}.png`;
  const thumb = `${String(index).padStart(4, '0')}-thumb.jpg`;
  const info = await input.rotate().resize({ width: 8192, height: 8192, fit: 'inside', withoutEnlargement: true }).png().toFile(path.join(directory, filename));
  await sharp(path.join(directory, filename)).resize(240, 150, { fit: 'cover' }).flatten({ background: '#0a0d14' }).jpeg({ quality: 82 }).toFile(path.join(directory, thumb));
  return { name: path.posix.basename(originalName), file: filename, thumb, width: info.width, height: info.height, resized: Math.max(metadata.width, metadata.height) > 8192 };
}

export async function extractImages(zipPath, directory,{signal}={}) {
  await mkdir(directory, { recursive: true });
  const zip = await new Promise((resolve, reject) => yauzl.open(zipPath, { lazyEntries: true, validateEntrySizes: true }, (err, zip) => err ? reject(err) : resolve(zip)));
  const candidates = []; const totals = { entries: 0, bytes: 0 };
  await new Promise((resolve, reject) => {
    let stopped = false;
    const fail = err => { if (!stopped) { stopped = true; zip.close(); reject(err); } };
    zip.on('error', fail);
    zip.on('end', resolve);
    zip.on('entry', async entry => {
      try {
        signal?.throwIfAborted();
        const name = assertZipEntry(entry, totals);
        if (/\/$/.test(name) || name.split('/').some(part => part.startsWith('.') || part === '__MACOSX') || !/\.(jpe?g|png|webp)$/i.test(name)) { zip.readEntry(); return; }
        if (candidates.length >= 300) throw new Error('The ZIP contains more than 300 images.');
        const rawPath = path.join(directory, `raw-${candidates.length}`);
        const stream = await new Promise((resolve, reject) => zip.openReadStream(entry, (err, stream) => err ? reject(err) : resolve(stream)));
        await pipeline(stream, createWriteStream(rawPath),...(signal?[{signal}]:[]));
        candidates.push({ rawPath, name });
        zip.readEntry();
      } catch (error) { fail(error); }
    });
    zip.readEntry();
  });
  if (!candidates.length) throw new Error('No JPG, PNG or WebP images were found in the ZIP.');
  candidates.sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true }));
  const images = [];
  for (const [index, candidate] of candidates.entries()) {
    signal?.throwIfAborted();
    try { images.push(await normalizeImage(candidate.rawPath, directory, index, candidate.name)); }
    catch { throw new Error(`Unable to read image "${path.posix.basename(candidate.name)}". Use JPG, PNG or WebP (up to 64 megapixels).`); }
    finally { await unlink(candidate.rawPath).catch(() => {}); }
  }
  return images;
}

// Measure stereo channels independently so out-of-phase music cannot cancel out.
export async function analyzeAudio(audioPath, directory, duration, {packed=duration>600,signal}={}) {
  const run=(exe,args)=>command(exe,args,{signal});
  const pcmPath = path.join(directory, 'analysis.pcm');
  await run(ffmpeg, ['-v', 'error', '-y', '-i', audioPath, '-vn', '-ac', '2', '-ar', '24000', '-f', 'f32le', pcmPath]);
  const pcm=await pcmReader(pcmPath);
  let rawSpectrum,normalizedSpectrum;
  try{
  const fft = new FFT(2048); const output = fft.createComplexArray(); const window = new Float64Array(2048);
  const hann=Float64Array.from({length:2048},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/2047));
  const fps = 60; const count = Math.ceil(duration * fps); const frames = []; const wave = [];
  const envelope=packed?new Float64Array(count*4):null;
  const batch=packed?new Float64Array(1800*64):null;let batchUsed=0;
  if(packed)rawSpectrum=await open(path.join(directory,'spectrum.tmp'),'w+');
  const ranges=spectralRanges(),spectralFrames=[];
  let spectralMaximum=.00001;
  let spectralSmooth=new Float64Array(64);
  let smooth = [0, 0, 0, 0];
  const maximum = [0.00001, 0.00001, 0.00001, 0.00001];
  for (let frame = 0; frame < count; frame++) {
    signal?.throwIfAborted();
    const start = Math.floor(frame / fps * 24000) - 1024; let energy = 0;
    const sample=await pcm.window(start*2,4096);
    const bands = [0, 0, 0]; const bins = [0, 0, 0];
    const powers=new Float64Array(1024);
    for (let channel = 0; channel < 2; channel++) {
      for (let i = 0; i < 2048; i++) { const value = sample(Math.max(0, start + i) * 2 + channel); energy += value * value; window[i] = value * hann[i]; }
      fft.realTransform(output, window);
      for (let bin = 2; bin < 1024; bin++) {
        const hz = bin * 24000 / 2048;
        const band = hz < 250 ? 0 : hz < 2500 ? 1 : 2;
        const power=output[bin * 2] ** 2 + output[bin * 2 + 1] ** 2;
        powers[bin]+=power;bands[band] += power; bins[band]++;
      }
    }
    const values = [Math.sqrt(energy / 4096), ...bands.map((value, index) => Math.sqrt(value / bins[index]))];
    smooth = values.map((value, index) => value * 0.5 + smooth[index] * 0.5);
    smooth.forEach((value, index) => { maximum[index] = Math.max(maximum[index], value); });
    if(packed)envelope.set(smooth,frame*4);else frames.push([...smooth]);
    spectralSmooth=Float64Array.from(ranges,([lo,hi],i)=>{
      let sum=0;for(let bin=lo;bin<hi;bin++)sum+=powers[bin];
      const value=Math.sqrt(sum/(2*(hi-lo)))*.5+spectralSmooth[i]*.5;
      spectralMaximum=Math.max(spectralMaximum,value);return value;
    });
    if(packed){batch.set(spectralSmooth,batchUsed);batchUsed+=64;if(batchUsed===batch.length||frame===count-1){await rawSpectrum.write(Buffer.from(batch.buffer,0,batchUsed*8));batchUsed=0;}}
    else spectralFrames.push([...spectralSmooth]);
  }
  if(packed){
   const values=new Uint16Array(count*4);for(let i=0;i<values.length;i++)values[i]=Math.round(Math.min(1,Math.pow(envelope[i]/maximum[i%4],.75))*1000);
   await writeFile(path.join(directory,'envelopes.bin'),Buffer.from(values.buffer));
   normalizedSpectrum=await open(path.join(directory,'spectrum.bin'),'w');
   const bytes=Buffer.from(batch.buffer);let offset=0;
   while(true){const {bytesRead}=await rawSpectrum.read(bytes,0,bytes.length,offset);if(!bytesRead)break;const values=new Uint16Array(bytesRead/8);for(let i=0;i<values.length;i++)values[i]=Math.round(Math.pow(batch[i]/spectralMaximum,.5)*1000);await normalizedSpectrum.write(Buffer.from(values.buffer));offset+=bytesRead;}
  }else for (const frame of frames) for (let band = 0; band < 4; band++) frame[band] = Math.round(Math.min(1, Math.pow(frame[band] / maximum[band], 0.75)) * 1000) / 1000;
  for (let index = 0; index < 500; index++) {
    const start = Math.floor(index / 500 * pcm.samples); const end = Math.floor((index + 1) / 500 * pcm.samples); let peak = 0;
    for(let first=start;first<end;first+=262144){const stop=Math.min(end,first+262144),sample=await pcm.window(first,stop-first);for(let i=first;i<stop;i++)peak=Math.max(peak,Math.abs(sample(i)));}
    wave.push(Math.round(peak * 1000) / 1000);
  }
  await pcm.close();await unlink(pcmPath);
  for(const frame of spectralFrames)for(let i=0;i<64;i++)frame[i]=Math.round(Math.pow(frame[i]/spectralMaximum,.5)*1000)/1000;
  const analysis = { ...(packed?{version:2,count,envelopesFile:'envelopes.bin'}:{}),fps, ...(packed?{}:{frames}), wave, spectrum: { minHz:spectrumMinHz,maxHz:spectrumMaxHz,bands:64,normalization:'global peak, square root compression',...(packed?{file:'spectrum.bin'}:{frames:spectralFrames}) } };
  analysis.analyzer = await analyzeStereoSpectrum(audioPath, directory, duration, run, ffmpeg,packed,signal);
  await writeFile(path.join(directory, 'analysis.json'), JSON.stringify(analysis));
  return analysis;
  }finally{await pcm.close().catch(()=>{});await rawSpectrum?.close();await normalizedSpectrum?.close();await unlink(pcmPath).catch(()=>{});await unlink(path.join(directory,'spectrum.tmp')).catch(()=>{});}
}
