import express from 'express';
import multer from 'multer';
import { mkdir, readFile, writeFile, readdir, rename, unlink, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';
import { extractImages, inspectAudio, command, ffmpeg, ffprobe } from './media.js';
import { defaults, validateConfig } from './config.js';
import { renderVideo } from './render.js';
import { SavedSettings } from './saved-settings.js';
import { RenderService } from './render-service.js';
import { writeAtomicJson } from './atomic-json.js';
import {clearCache} from './cache.js';
import {projectAudioPath} from './project-paths.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = path.resolve(process.env.DATA_DIR || path.join(root, 'data'));
const projectsDir = path.join(data, 'projects');
const uploadsDir = path.join(data, 'uploads');
const outputsDir = path.join(data, 'exports');
await Promise.all([projectsDir, uploadsDir, outputsDir].map(dir => mkdir(dir, { recursive: true })));
const app = express();
const port = Number(process.env.PORT || 5180);
const host = process.env.HOST || '0.0.0.0';
const jobs = new Map(); const projects = new Map();
const savedSettings = new SavedSettings(data);
let exportStarting=false;
let cacheClearing=false,importsInFlight=0,mutationsInFlight=0;const analysisWorkers=new Map(),importControllers=new Map();
const validId = value => /^[0-9a-f-]{36}$/.test(value || '');
const lan = Object.entries(os.networkInterfaces()).flatMap(([name, addresses]) => addresses.filter(item => item.family === 'IPv4' && !item.internal && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(item.address)).map(item => ({ name, url: `http://${item.address}:${port}` })));
let toolsReady = true;
try { await command(ffmpeg, ['-version']); await command(ffprobe, ['-version']); } catch { toolsReady = false; }

app.disable('x-powered-by');
app.use((req, res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return res.status(403).json({ error: 'Request origin is not allowed.' });
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  next();
});
app.use(express.json({ limit: '64kb' }));
app.use((req,res,next)=>{
  if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.path!=='/api/cache/clear'){
    if(cacheClearing)return res.status(409).json({error:'Cache clearing is in progress.'});
    mutationsInFlight++;let released=false;
    const release=()=>{if(!released){released=true;mutationsInFlight--;}};
    res.once('finish',release);res.once('close',release);
  }
  next();
});
const upload = multer({ dest: uploadsDir, limits: { fileSize: 16 * 1024 * 1024 * 1024, files: 2, fields: 0 }, fileFilter: (req, file, cb) => {
  const valid = (file.fieldname === 'audio' && /\.(wav|mp3)$/i.test(file.originalname)) || (file.fieldname === 'images' && /\.zip$/i.test(file.originalname));
  cb(valid ? null : new Error('Upload a WAV or MP3 file and a ZIP archive.'), valid);
} }).fields([{ name: 'audio', maxCount: 1 }, { name: 'images', maxCount: 1 }]);

function publicProject(project) {
  return { id: project.id, name: project.name, status: project.status, message: project.message, error: project.error, audio: project.audio, audioName: project.audioName, imagesName: project.imagesName,
    audioUrl: `/api/projects/${project.id}/audio${path.extname(project.audioPath)}`, analysisUrl: `/api/projects/${project.id}/analysis.json`, createdAt: project.createdAt, progress:project.progress||0,
    config: project.config || defaults, images: (project.images || []).map(image => ({ ...image, url: `/api/projects/${project.id}/images/${image.file}`, thumbnail: `/api/projects/${project.id}/images/${image.thumb}` })) };
}
async function saveProject(project) {
  await writeAtomicJson(path.join(projectsDir, project.id, 'project.json'),project);
}
async function getProject(id) {
  if (!validId(id)) return null;
  if (projects.has(id)) return projects.get(id);
  try { const project = JSON.parse(await readFile(path.join(projectsDir, id, 'project.json'), 'utf8'));project.audioPath=projectAudioPath(project,path.join(projectsDir,id)); projects.set(id, project); return project; } catch { return null; }
}
function runAnalysis(audioPath, directory, duration,projectId) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./analysis-worker.js', import.meta.url), { workerData: { audioPath, directory, duration } });
    analysisWorkers.set(projectId,worker);
    worker.once('message', result => result.error ? reject(new Error(result.error)) : resolve());
    worker.once('error', reject);
    worker.once('exit', code => {analysisWorkers.delete(projectId);if (code) reject(new Error('Audio analysis was interrupted.')); });
  });
}

const production=new RenderService({directory:outputsDir,baseUrl:`http://127.0.0.1:${port}`,jobs,savedSettings,publicProject});
for(const file of await readdir(outputsDir)){
  if(!/^[0-9a-f-]{36}\.json$/.test(file))continue;
  try{const job=JSON.parse(await readFile(path.join(outputsDir,file),'utf8'));
    if(job.kind==='production'&&['starting','rendering','encoding'].includes(job.status)){job.status='interrupted';job.error='The server stopped during rendering. Please start the render again.';await writeAtomicJson(path.join(outputsDir,file),job);}
    if(job.kind==='production')jobs.set(job.id,job);
  }catch(error){console.error('Lecture du suivi : '+error.message);}
}
app.get('/api/service',(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  const active=[...jobs.values()].find(job=>['starting','rendering','encoding'].includes(job.status));
  const completed=[...jobs.values()].filter(job=>job.kind==='production'&&job.status==='completed').sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];
  res.json({ready:toolsReady,format:{width:1920,height:1080,fps:60,channels:2},activeJob:active?{id:active.id,projectId:active.projectId}:null,latestCompletedJob:completed?{id:completed.id,projectId:completed.projectId}:null});
});
app.get('/api/status', (req, res) => res.json({ name: 'MusicFrame Render', version: '1.0.0', lan, ffmpeg: toolsReady, engines: [{ id: 'astrofox', label: 'Astrofox', status: 'ready', detail: 'Adapted photo effects' }], defaults }));
app.get('/api/saved-settings', async (req, res, next) => {
  try { res.setHeader('Cache-Control', 'no-store'); res.json(await savedSettings.read()); } catch (error) { next(error); }
});
app.put('/api/saved-settings/:preset', async (req, res) => {
  try {
    const project = await getProject(req.body.projectId);
    if (project?.status !== 'ready') return res.status(400).json({ error: 'Open a project before saving presets.' });
    const record = await savedSettings.save(req.params.preset, req.body.config, project.id);
    res.json(record);
  } catch (error) { res.status(400).json({ error: error.message }); }
});
app.get('/api/reference', async (req, res, next) => {
  try {
    let reference;
    try { reference = JSON.parse(await readFile(path.join(data, 'reference-sources.json'), 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return res.json(null); throw error; }
    const project = await getProject(reference.projectId);
    if (project?.status !== 'ready') return res.status(503).json({ error: 'The reference project is unavailable.' });
    res.json({ project: publicProject(project), audioName: path.basename(reference.audio), imagesName: path.basename(reference.images) });
  } catch (error) { next(error); }
});
app.get('/api/projects', async (req, res, next) => {
  try {
    const ids = await readdir(projectsDir); const result = [];
    for (const id of ids) { const project = await getProject(id); if (project?.status === 'ready') result.push(publicProject(project)); }
    res.json(result.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  } catch (error) { next(error); }
});
app.post('/api/projects', (req, res, next) => {
  if(cacheClearing)return res.status(409).json({error:'Cache clearing is in progress.'});
  if (!toolsReady) return res.status(503).json({ error: 'FFmpeg and FFprobe are required on the server.' });
  importsInFlight++;let importReleased=false;const releaseImport=()=>{if(!importReleased){importReleased=true;importsInFlight--;}};
  req.once('aborted',releaseImport);
  upload(req, res, async error => {
    const temporaryFiles = Object.values(req.files || {}).flat();
    if (error || !req.files?.audio?.[0] || !req.files?.images?.[0]) {
      releaseImport();
      await Promise.all(temporaryFiles.map(file => unlink(file.path).catch(() => {})));
      return res.status(400).json({ error: error?.message || 'Add a WAV or MP3 file and a ZIP archive of images.' });
    }
    const id = randomUUID(); const directory = path.join(projectsDir, id);
    try {
      await mkdir(directory);
      const audioFile = req.files.audio[0]; const zipFile = req.files.images[0];
      const audioPath = path.join(directory, 'audio'+path.extname(audioFile.originalname).toLowerCase());
      await rename(audioFile.path, audioPath);
      const savedDefault = (await savedSettings.read()).presets[defaults.preset];
      const project = { id, name: path.parse(audioFile.originalname).name.slice(0, 160), audioName: audioFile.originalname.slice(0, 200), imagesName: zipFile.originalname.slice(0, 200), audioPath, status: 'processing', progress:5, message: 'Reading your audio file', images: [], config: { ...defaults, ...savedDefault?.config }, createdAt: new Date().toISOString() };
      const controller=new AbortController();importControllers.set(id,controller);
      project.usage=req.get('X-Visualizer-Mode')==='production'?'production':'studio';projects.set(id, project); await saveProject(project);
      res.status(202).json(publicProject(project));
      void (async () => {
        try {
          project.audio = await inspectAudio(audioPath);
          project.message = 'Preparing your images';project.progress=20;
          project.images = await extractImages(zipFile.path, path.join(directory, 'images'),{signal:controller.signal});
          // Short tracks must not leave the later photos outside the playable timeline.
          project.config.imageSeconds = Math.max(0.04, Math.min(project.config.imageSeconds, project.audio.duration / project.images.length));
          project.message = 'Analyzing your audio';project.progress=50;
          if(project.cancelRequested)throw Error('Upload cancelled.');
          await runAnalysis(audioPath, directory, project.audio.duration,project.id);
          if(project.cancelRequested)throw Error('Upload cancelled.');
          project.status = 'ready'; project.message = 'Ready to render';project.progress=100;
          await saveProject(project);
        } catch (error) {
          project.status = project.cancelRequested?'cancelled':'error'; project.error = error.message; project.message = 'Upload interrupted'; await saveProject(project);
        } finally {importControllers.delete(id);releaseImport();await unlink(zipFile.path).catch(() => {}); }
      })();
    } catch (error) {
      releaseImport();
      await Promise.all(temporaryFiles.map(file => unlink(file.path).catch(() => {})));
      await rm(directory, { recursive: true, force: true }).catch(() => {});
      next(error);
    }
  });
});
app.get('/api/projects/:id', async (req, res) => {
  const project = await getProject(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  res.json(publicProject(project));
});
app.post('/api/projects/:id/cancel',async(req,res)=>{
 const project=await getProject(req.params.id);if(project?.status!=='processing')return res.status(404).json({error:'There is no active upload to stop.'});
 project.cancelRequested=true;project.message='Stopping the upload';importControllers.get(project.id)?.abort();analysisWorkers.get(project.id)?.postMessage('cancel');res.json({ok:true});
});
app.post('/api/cache/clear',async(req,res)=>{
 if(cacheClearing||importsInFlight||mutationsInFlight||exportStarting||[...jobs.values()].some(j=>['starting','rendering','encoding'].includes(j.status)))return res.status(409).json({error:'Wait for current operations to finish or stop the render before clearing the cache.'});
 cacheClearing=true;try{await Promise.all([...production.pending,savedSettings.pending]);res.json(await clearCache({data,projects,jobs}));}catch(error){res.status(500).json({error:error.message});}finally{cacheClearing=false;}
});
app.put('/api/projects/:id/config', async (req, res, next) => {
  try {
    const project = await getProject(req.params.id);
    if (!project || project.status !== 'ready') return res.status(404).json({ error: 'Project unavailable.' });
    project.config = validateConfig(req.body); await saveProject(project); res.json(project.config);
  } catch (error) { res.status(400).json({ error: error.message }); }
});
app.get('/api/projects/:id/:file', async (req, res) => {
  if (!validId(req.params.id) || !['audio.mp3','audio.wav','analysis.json','envelopes.bin','spectrum.bin','analyzer.bin'].includes(req.params.file)) return res.sendStatus(404);
  const file = path.join(projectsDir, req.params.id, req.params.file);
  if (!existsSync(file)) return res.sendStatus(404);
  res.sendFile(file);
});
app.get('/api/projects/:id/images/:file', (req, res) => {
  if (!validId(req.params.id) || !/^\d{4}(\.png|-thumb\.jpg)$/.test(req.params.file)) return res.sendStatus(404);
  const file = path.join(projectsDir, req.params.id, 'images', req.params.file);
  if (!existsSync(file)) return res.sendStatus(404);
  res.setHeader('Cache-Control', 'private, max-age=86400'); res.sendFile(file);
});

app.post('/api/projects/:id/render',async(req,res)=>{
  if(cacheClearing)return res.status(409).json({error:'Cache clearing is in progress.'});
  if(!toolsReady)return res.status(503).json({error:'The video engine is unavailable on the server.'});
  if(exportStarting||[...jobs.values()].some(job=>['starting','rendering','encoding'].includes(job.status)))return res.status(409).json({error:'A render is already running. Wait for it to finish.'});
  exportStarting=true;
  try{const project=await getProject(req.params.id);if(project?.status!=='ready')return res.status(400).json({error:'Upload your files first.'});const job=await production.start(project);res.status(202).json({...job,cancel:undefined});}
  catch(error){res.status(400).json({error:error.message});}finally{exportStarting=false;}
});
app.post('/api/projects/:id/exports', async (req, res) => {
  if(cacheClearing)return res.status(409).json({error:'Cache clearing is in progress.'});
  if (exportStarting||[...jobs.values()].some(job => ['starting', 'rendering', 'encoding'].includes(job.status))) return res.status(409).json({ error: 'An export is already running. Wait for it to finish or stop it.' });
  exportStarting=true;
  try {
    const project = await getProject(req.params.id);
    if (!project || project.status !== 'ready') return res.status(400).json({ error: 'Upload your media first.' });
    const config = validateConfig(req.body); const id = randomUUID();
    const job = { id, projectId: project.id, config, status: 'starting', progress: 0, frames: 0, message: 'Preparing the render', createdAt: new Date().toISOString() };
    jobs.set(id, job); const output = path.join(outputsDir, `${id}.mp4`);
    res.status(202).json(job);
    void (async () => {
      try {
        job.result = await renderVideo({ job, project: { ...publicProject(project), audioPath: project.audioPath }, config, output, baseUrl: `http://127.0.0.1:${port}` });
        job.status = 'completed'; job.progress = 100; job.message = 'Your video is ready';
        job.downloadUrl = `/api/exports/${id}/download`;
      } catch (error) { job.status = job.cancelRequested ? 'cancelled' : 'error'; job.error = error.message; job.message = job.cancelRequested ? 'Export cancelled' : 'Rendering failed'; await unlink(output).catch(() => {}); }
      finally { await writeFile(path.join(outputsDir, `${id}.json`), JSON.stringify({ ...job, cancel: undefined }, null, 2)); }
    })();
  } catch (error) { res.status(400).json({ error: error.message }); } finally { exportStarting=false; }
});
app.get('/api/exports/:id', async (req, res) => {
  let job = jobs.get(req.params.id);
  if (!job && validId(req.params.id)) try { job = JSON.parse(await readFile(path.join(outputsDir, `${req.params.id}.json`), 'utf8')); } catch {}
  if (!job) return res.status(404).json({ error: 'Export not found.' });
  res.json({ ...job, cancel: undefined });
});
app.post('/api/exports/:id/cancel', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job || !['starting', 'rendering', 'encoding'].includes(job.status)) return res.status(404).json({ error: 'There is no active export to stop.' });
  job.cancelRequested = true; job.cancel?.(); res.json({ ok: true });
});
app.get('/api/exports/:id/download', async (req, res) => {
  if (!validId(req.params.id)) return res.sendStatus(404);
  let job = jobs.get(req.params.id);
  if (!job) try { job = JSON.parse(await readFile(path.join(outputsDir, `${req.params.id}.json`), 'utf8')); } catch {}
  if (job?.status !== 'completed') return res.sendStatus(404);
  res.download(path.join(outputsDir, `${req.params.id}.mp4`), 'musicframe-render-1080p.mp4');
});
app.get('/api/exports/:id/quicktime', async (req, res) => {
  if (!validId(req.params.id)) return res.sendStatus(404);
  let job = jobs.get(req.params.id);
  if (!job) try { job = JSON.parse(await readFile(path.join(outputsDir, `${req.params.id}.json`), 'utf8')); } catch {}
  if (job?.status !== 'completed' || !job.quicktimeDownloadUrl) return res.sendStatus(404);
  res.download(path.join(outputsDir, `${req.params.id}.mov`), 'musicframe-render-20-effets-1080p60.mov');
});
app.use('/lib/butterchurn', express.static(path.join(root, 'node_modules', 'butterchurn', 'lib'), { maxAge: '1d' }));
app.use('/lib/three', express.static(path.join(root, 'node_modules', 'three'), { maxAge: '1d' }));
app.use(express.static(path.join(root, 'public')));
app.use((error, req, res, next) => { console.error(error.message); if (!res.headersSent) res.status(400).json({ error: error.message || 'An error occurred.' }); });
const server = app.listen(port, host, () => {
  console.log(`MusicFrame Render · http://localhost:${port}`);
  lan.forEach(item => console.log(`LAN (${item.name}) · ${item.url}`));
  if (!toolsReady) console.log('FFmpeg manquant : définis FFMPEG_PATH et FFPROBE_PATH.');
});
server.requestTimeout = 0; // A large WAV over a slow LAN may take hours to upload.
