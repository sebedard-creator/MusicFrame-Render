import { VisualEngine } from './engine.js';
import { presets, presetNames } from './presets.js';
import { nextPreviewDeadline } from './preview-timing.js';
const $ = selector => document.querySelector(selector);
const audio = $('#audio');
const state = { files: {}, project: null, analysis: null, engine: null, config: null, busy: false, needsDraw: false, drawing: false, nextFrame: 0, job: null, savedSettings: {}, settingsSaving: false };
const previewModes = { adjust: { width: 480, height: 270, fps: 30 }, responsive: { width: 640, height: 360, fps: 60 }, detailed: { width: 960, height: 540, fps: 30 } };
state.previewMode = 'adjust';
try { const stored = localStorage.getItem('musicframe-render-preview-mode-v2'); if (Object.hasOwn(previewModes, stored)) state.previewMode = stored; } catch {}
$('#preview-mode').value = state.previewMode;
$('#preview-help').hidden = state.previewMode !== 'adjust';
let previewPerformance = { start: 0, frames: 0 };
$('#preview-mode').addEventListener('change', event => {
  state.previewMode = event.target.value;
  const mode = previewModes[state.previewMode]; state.engine?.resize(mode.width, mode.height);
  state.engine?.setLightweightPreview(state.previewMode === 'adjust');
  $('#preview-help').hidden = state.previewMode !== 'adjust';
  state.needsDraw = true; state.nextFrame = 0; previewPerformance = { start: performance.now(), frames: 0 };
  $('#preview-stats').textContent = audio.paused ? 'En pause' : 'Mesure en cours…';
  try { localStorage.setItem('musicframe-render-preview-mode-v2', state.previewMode); } catch {}
});
function timeLabel(seconds) { const value = Math.floor(seconds || 0); return value >= 3600 ? `${Math.floor(value / 3600)}:${String(Math.floor(value / 60) % 60).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}` : `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`; }
let toastTimer;
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 9000); }
async function api(url, options) { const response = await fetch(url, options); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'La requête a échoué.'); return data; }
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function chooseFile(kind, file) {
  if (!file) return;
  if (!(kind === 'audio' ? /\.mp3$/i : /\.zip$/i).test(file.name)) { toast(kind === 'audio' ? 'Choisis un fichier MP3.' : 'Choisis une archive ZIP.'); return; }
  if (file.size > 512 * 1024 * 1024) { toast('Le fichier dépasse 512 Mo.'); return; }
  state.files[kind] = file;
  $(`#${kind === 'audio' ? 'audio' : 'zip'}-label`).textContent = file.name;
  $(`#${kind === 'audio' ? 'audio' : 'zip'}-zone`).classList.add('selected');
  $('#import-button').disabled = state.busy || !state.files.audio || !state.files.images;
}
for (const [name, kind] of [['audio', 'audio'], ['zip', 'images']]) {
  const input = $(`#${name}-input`); const zone = $(`#${name}-zone`);
  input.addEventListener('change', () => chooseFile(kind, input.files[0]));
  zone.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); input.click(); } });
  zone.addEventListener('dragover', event => { event.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', event => { event.preventDefault(); zone.classList.remove('dragover'); chooseFile(kind, event.dataTransfer.files[0]); });
}
function importStatus(message, error = false) { const target = $('#import-status'); target.hidden = false; target.textContent = message; target.classList.toggle('error', error); }
function uploadFiles(form) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest(); request.open('POST', '/api/projects'); request.responseType = 'json';
    request.upload.onprogress = event => { if (event.lengthComputable) importStatus(`Transfert vers le studio · ${Math.round(event.loaded / event.total * 100)} %`); };
    request.onerror = () => reject(new Error('Connexion au studio interrompue.'));
    request.onload = () => request.status >= 200 && request.status < 300 ? resolve(request.response) : reject(new Error(request.response?.error || 'Import impossible.'));
    request.send(form);
  });
}
$('#import-button').addEventListener('click', async () => {
  if (state.busy || !state.files.audio || !state.files.images) return;
  state.busy = true; $('#import-button').disabled = true;
  try {
    audio.pause(); importStatus('Transfert vers le studio…');
    const form = new FormData(); form.append('audio', state.files.audio); form.append('images', state.files.images);
    let project = await uploadFiles(form);
    while (project.status === 'processing') { importStatus(project.message + '…'); await wait(900); project = await api(`/api/projects/${project.id}`); }
    if (project.status !== 'ready') throw new Error(project.error || 'Import interrompu.');
    await openProject(project); await refreshProjects();
    importStatus(`Session prête · ${project.images.length} image${project.images.length > 1 ? 's' : ''}.`);
  } catch (error) { importStatus(error.message, true); }
  finally { state.busy = false; $('#import-button').disabled = !state.files.audio || !state.files.images; }
});

async function refreshProjects() {
  const projects = await api('/api/projects'); const select = $('#recent-projects');
  select.replaceChildren(new Option('Choisir une session…', ''));
  projects.forEach(project => select.add(new Option(project.name, project.id)));
  if (state.project) select.value = state.project.id;
}
$('#recent-projects').addEventListener('change', async event => { if (!event.target.value) return; try { await openProject(await api(`/api/projects/${event.target.value}`)); } catch (error) { toast(error.message); } });

async function openReference(reference) {
  await openProject(reference.project);
  $('#manual-sources').open = false;
  $('#audio-label').textContent = reference.audioName; $('#zip-label').textContent = reference.imagesName;
  importStatus(`Sources de test chargées · ${reference.project.images.length} images.`);
}
$('#reference-button').addEventListener('click', async () => {
  if (state.busy) return;
  const button = $('#reference-button'); button.disabled = true;
  try {
    const reference = await api('/api/reference');
    if (!reference) throw new Error('Aucune source de test configurée.');
    await openReference(reference);
  } catch (error) { toast(error.message); }
  finally { button.disabled = false; }
});

async function openProject(project) {
  audio.pause();
  const {loadAnalysis}=await import('./analysis-loader.js');const analysis=await loadAnalysis(project.analysisUrl);
  if (!state.engine) { const mode = previewModes[state.previewMode]; state.engine = await new VisualEngine($('#preview'), mode.width, mode.height).initialize(); }
  state.project = project; state.analysis = analysis;
  state.config = { ...state.defaults, ...project.config };
  if (!Object.hasOwn(presets, state.config.preset)) state.config = { ...state.config, ...presets.led, ...(state.savedSettings.led?.config || {}), preset: 'led' };
  $('#recent-projects').value = project.id;
  state.files = {};
  $('#audio-input').value = ''; $('#zip-input').value = ''; $('#import-button').disabled = true;
  $('#audio-label').textContent = project.audioName; $('#zip-label').textContent = project.imagesName || 'Images de la session';
  $('#audio-zone').classList.add('selected'); $('#zip-zone').classList.add('selected');
  importStatus(`Session chargée · ${project.images.length} images.`);
  state.engine.setProject(project, analysis);
  state.engine.setLightweightPreview(state.previewMode === 'adjust');
  audio.src = project.audioUrl; audio.volume = Number($('#volume').value); audio.load();
  $('#project-name').textContent = project.name;
  $('#source-details').hidden = false;
  $('#source-duration').textContent = timeLabel(project.audio.duration);
  $('#source-channels').textContent = project.audio.channels === 2 ? 'Stéréo' : `${project.audio.channels} canal`;
  $('#source-count').textContent = project.images.length;
  $('#duration').textContent = timeLabel(project.audio.duration); $('#current-time').textContent = '00:00';
  $('#seek').max = project.audio.duration; $('#seek').value = 0;
  for (const selector of ['#seek', '#play-button', '#restart-button', '#export-button']) $(selector).disabled = false;
  $('#empty-preview').hidden = true; $('#preview').hidden = false;
  $('#image-count').textContent = project.images.length;
  $('#engine-status').textContent = 'Astrofox · prêt';
  const list = $('#image-list'); list.replaceChildren();
  project.images.forEach((image, index) => {
    const button = document.createElement('button'); button.className = 'image-card'; button.title = `${image.name} · ${image.width} × ${image.height}`;
    button.setAttribute('aria-label', `Afficher l’image ${index + 1} : ${image.name}`);
    const thumb = document.createElement('img'); thumb.src = image.thumbnail; thumb.alt = ''; thumb.loading = 'lazy';
    const label = document.createElement('span'); label.textContent = image.name;
    const number = document.createElement('small'); number.textContent = String(index + 1).padStart(2, '0');
    button.append(thumb, label, number);
    button.addEventListener('click', () => { audio.currentTime = Math.min(project.audio.duration - .01, index * state.config.imageSeconds); state.needsDraw = true; });
    list.append(button);
  });
  localStorage.setItem('musicframe-render-project', project.id);
  syncControls(); state.needsDraw = true; drawWaveform(0);
  if (project.images.some(image => image.resized)) toast('Les images de plus de 8192 pixels ont été réduites pour le rendu.');
}
function syncControls() {
  if (!state.config) return;
  document.querySelectorAll('[data-model]').forEach(element => { element.hidden = element.dataset.model !== state.config.preset; });
  document.querySelectorAll('[data-hide-model]').forEach(element => { element.hidden = element.dataset.hideModel.split(' ').includes(state.config.preset); });
  const modelNotes = { orbit: 'Conservé · Vos réglages Rotation orbitale v1 sont sauvegardés sur le serveur.', dataGrains: 'Conservé · Vos réglages Essaim de données v1 sont sauvegardés sur le serveur.', holo: 'Conservé · Vos réglages Strates holographiques v1 sont sauvegardés sur le serveur.', stereoGlow: 'À essayer · Spectre stéréo transparent, réglages de votre capture. Choisissez la visualisation photo en dessous.', led: 'Conservé · Vos réglages Matrice LED sont sauvegardés sur le serveur.', relief: 'Conservé · Vos réglages Relief granulaire v1 sont sauvegardés sur le serveur.', dither: 'Conservé · Vos réglages Trame numérique v1 sont sauvegardés sur le serveur.', pixelsort: 'Conservé · Vos réglages Tri spectral v1 sont sauvegardés sur le serveur.', voxel: 'Conservé · Vos réglages Mosaïque voxel v1 sont sauvegardés sur le serveur.', ascii: 'Conservé · Vos réglages Écran matriciel v1 sont sauvegardés sur le serveur.', crt: 'Conservé · Vos réglages Tube cathodique v1 sont sauvegardés sur le serveur.', stipple: 'Conservé · Vos réglages Pointillisme granulaire v1 sont sauvegardés sur le serveur.', morph: 'Conservé · Vos réglages Morphose granulaire v1 sont sauvegardés sur le serveur.', cymatics: 'Conservé · Vos réglages Cymatique photo v1 sont sauvegardés sur le serveur.', tessera: 'Conservé · Vos réglages Décodage numérique v1 sont sauvegardés sur le serveur.', fenestra: 'Conservé · Vos réglages Fenêtres de signal v2 sont sauvegardés sur le serveur.', raster: 'Conservé · Vos réglages Nuage numérique v1 sont sauvegardés sur le serveur.', codec: 'Conservé · Vos réglages Codec granulaire v1 sont sauvegardés sur le serveur.', plexus: 'Conservé · Vos réglages Plexus photo v1 sont sauvegardés sur le serveur.', spectrum: 'Conservé · Vos réglages Spectre granulaire v2 sont sauvegardés sur le serveur.', chrono: 'Conservé · Vos réglages Scan temporel v1 sont sauvegardés sur le serveur.' };
  $('#model-note').textContent = modelNotes[state.config.preset] || 'Ancien essai · Choisissez un modèle ci-dessous.';
  document.querySelectorAll('[data-config]').forEach(input => {
    const key = input.dataset.config;
    if (input.tagName === 'SELECT' && ![...input.options].some(option => option.value === String(state.config[key]))) input.add(new Option(`${Number(state.config[key].toFixed(2))} secondes (auto)`, state.config[key]));
    input.value = state.config[key];
    updateOutput(key);
  });
  document.querySelectorAll('[data-preset]').forEach(button => button.classList.toggle('active', button.dataset.preset === state.config.preset));
  const source = state.config.preset === 'orbit' ? 'MusicFrame Render · rotation photo / Three.js MIT' : state.config.preset === 'dataGrains' ? 'MusicFrame Render · microfragments GPU / Three.js MIT' : state.config.preset === 'lamella' ? 'MusicFrame Render · lamelles photo / Three.js MIT' : state.config.preset === 'advection' ? 'MusicFrame Render · flux granulaire / Three.js MIT' : state.config.preset === 'portal' ? 'Three.js · attaques 3D · MIT' : state.config.preset === 'wavefield' ? 'Three.js · rubans audio 3D · MIT' : state.config.preset === 'kinetic' ? 'Three.js · prismes 3D · MIT' : state.config.preset === 'holo' ? 'Three.js · strates 3D · MIT' : state.config.preset === 'sculpt' ? 'Three.js · relief 3D · MIT' : state.config.preset === 'stereoGlow' ? 'FFT Visualizer · MIT' : state.config.preset === 'pegboard' ? 'Fosfora · Pegboard adapté' : state.config.preset === 'moire' ? 'MusicFrame Render · interférences / Three.js' : state.config.preset === 'shear' ? 'MusicFrame Render · cisaillement / Three.js' : state.config.preset === 'chrono' ? 'MusicFrame Render · slit scan photo / Three.js' : state.config.preset === 'vector' ? 'MusicFrame Render · gradients photo / Three.js' : state.config.preset === 'quadtree' ? 'MusicFrame Render · subdivision / Three.js' : state.config.preset === 'radar' ? 'MusicFrame Render · radar photo / Three.js' : state.config.preset === 'spectrum' ? 'MusicFrame Render · FFT / Three.js' : state.config.preset === 'press' ? 'MusicFrame Render · trames CMJN / Three.js' : state.config.preset === 'circuit' ? 'MusicFrame Render · circuits / Three.js' : state.config.preset === 'corruption' ? 'glitch-canvas · corruption JPEG / MIT' : state.config.preset === 'facets' ? 'MusicFrame Render · microfacettes / Three.js' : state.config.preset === 'binary' ? 'MusicFrame Render · plans binaires / Three.js' : state.config.preset === 'plexus' ? 'Three.js · particules connectées adaptées' : state.config.preset === 'codec' ? 'MusicFrame Render · JPEG local / Three.js' : state.config.preset === 'weave' ? 'Butterchurn · tissage photo original' : state.config.preset === 'feedback' ? 'Butterchurn · preset photo original' : state.config.preset === 'shock' ? 'Fosfora · Pulse adapté' : state.config.preset === 'mirrorgrain' ? 'Fosfora · Prism adapté' : state.config.preset === 'crystal' ? 'Fosfora · Shards adapté' : state.config.preset === 'raster' ? 'Fosfora · Raster adapté' : state.config.preset === 'intarsia' ? 'Fosfora · Intarsia adapté' : state.config.preset === 'fenestra' ? 'Fosfora · Fenestra adapté' : state.config.preset === 'tessera' ? 'Fosfora · Tessera adapté' : state.config.preset === 'reliquary' ? 'Fosfora · Reliquary adapté' : state.config.preset === 'etch' ? 'Fosfora · Etch adapté' : state.config.preset === 'tunnel' ? 'Fosfora · Tunnel adapté' : state.config.preset === 'cymatics' ? 'Fosfora · Cymatics adapté' : state.config.preset === 'shards' ? 'Fosfora · Raster polygonal' : state.config.preset === 'morph' ? 'Fosfora · Morph adapté' : state.config.preset === 'ribbons' ? 'phase-viz · colonnes adaptées' : state.config.preset === 'echo' ? 'phase-viz · rémanence adaptée' : state.config.preset === 'phase' ? 'phase-viz · Image FX' : state.config.preset === 'stipple' ? 'Ditherer · Stipple' : state.config.preset === 'databend' ? 'Ditherer · Data Bend' : state.config.preset === 'crt' ? 'Ditherer · Vintage TV' : state.config.preset === 'topography' ? 'Ditherer · Contour Lines' : state.config.preset === 'stutter' ? 'MusicFrame Render · Astrofox RGB' : state.config.preset === 'hex' ? 'Ditherer · Hex Pixelate' : state.config.preset === 'ascii' ? 'Ditherer · ASCII' : state.config.preset === 'micro' ? 'Ditherer · Pixel Scatter' : state.config.preset === 'trace' ? 'Memory Signal · variante filaire' : state.config.preset === 'interference' ? 'MusicFrame Render · Astrofox RGB' : state.config.preset === 'voxel' ? 'Memory Signal · variante voxel' : state.config.preset === 'pixelsort' ? 'Ditherer' : state.config.preset === 'granular' ? 'Granulator' : state.config.preset === 'dither' ? 'Ditherer' : state.config.preset === 'relief' ? 'Memory Signal' : 'Astrofox';
  $('#visual-source').textContent = source;
  $('#visual-description').textContent = state.config.preset === 'orbit' ? 'Photo → rotation musicale douce' : state.config.preset === 'dataGrains' ? 'Photo → essaim de microfragments lumineux' : state.config.preset === 'lamella' ? 'Photo → lamelles en relief réactives' : state.config.preset === 'advection' ? 'Photo → micrograins en mouvement' : state.config.preset === 'portal' ? 'Photo → portail percussif 3D' : state.config.preset === 'wavefield' ? 'Photo → cascade spectrale 3D' : state.config.preset === 'kinetic' ? 'Photo → fragments en circulation 3D' : state.config.preset === 'holo' ? 'Photo → plans holographiques réactifs' : state.config.preset === 'sculpt' ? 'Photo → surface 3D réactive' : state.config.preset === 'stereoGlow' ? 'Photo + spectre stéréo transparent' : state.config.preset === 'pegboard' ? 'Photo → panneau de points rétroéclairés' : state.config.preset === 'moire' ? 'Photo → trames d’interférence réactives' : state.config.preset === 'shear' ? 'Photo → bandes spectrales déformées' : state.config.preset === 'chrono' ? 'Photo → balayage temporel réactif' : state.config.preset === 'vector' ? 'Photo → champ de flèches réactives' : state.config.preset === 'quadtree' ? 'Photo → mosaïque adaptative réactive' : state.config.preset === 'radar' ? 'Photo → radar de grains réactifs' : state.config.preset === 'spectrum' ? 'Photo → microbarres spectrales réactives' : state.config.preset === 'press' ? 'Photo → trames colorées réactives' : state.config.preset === 'circuit' ? 'Photo → pistes électroniques réactives' : state.config.preset === 'corruption' ? 'Photo → ruptures JPEG réactives' : state.config.preset === 'facets' ? 'Photo → facettes articulées réactives' : state.config.preset === 'binary' ? 'Photo → couches de bits réactives' : state.config.preset === 'plexus' ? 'Photo → réseau de particules connecté' : state.config.preset === 'codec' ? 'Photo → compression granulaire réactive' : state.config.preset === 'weave' ? 'Photo → microfilaments croisés' : state.config.preset === 'feedback' ? 'Photo → mémoire vidéo réactive' : state.config.preset === 'shock' ? 'Photo → ondes dans les grains' : state.config.preset === 'mirrorgrain' ? 'Photo → prisme de grains' : state.config.preset === 'crystal' ? 'Photo → cellules de Voronoï' : state.config.preset === 'raster' ? 'Photo → grains en dispersion' : state.config.preset === 'intarsia' ? 'Photo → mosaïque de tuiles actives' : state.config.preset === 'fenestra' ? 'Photo → fenêtres connectées' : state.config.preset === 'tessera' ? 'Photo → décodage par cellules' : state.config.preset === 'reliquary' ? 'Photo → éjection de particules' : state.config.preset === 'etch' ? 'Photo → oscillations lumineuses' : state.config.preset === 'tunnel' ? 'Photo → tunnel en mouvement' : state.config.preset === 'cymatics' ? 'Photo → motifs de Chladni' : state.config.preset === 'shards' ? 'Photo → facettes réactives' : state.config.preset === 'morph' ? 'Photos → particules en morphing' : state.config.preset === 'ribbons' ? 'Photo → rubans verticaux' : state.config.preset === 'echo' ? 'Photo → échos de mouvement' : state.config.preset === 'phase' ? 'Photo → signal industriel' : state.config.preset === 'stipple' ? 'Photo → grains lumineux' : state.config.preset === 'databend' ? 'Photo → données corrompues' : state.config.preset === 'crt' ? 'Photo → tube cathodique réactif' : state.config.preset === 'topography' ? 'Photo → courbes de niveau' : state.config.preset === 'stutter' ? 'Photo → reprises rythmiques' : state.config.preset === 'hex' ? 'Photo → alvéoles lumineuses' : state.config.preset === 'ascii' ? 'Photo → caractères lumineux' : state.config.preset === 'micro' ? 'Photo → micro-fragments' : state.config.preset === 'trace' ? 'Photo → lignes en relief' : state.config.preset === 'interference' ? 'Photo → interférences optiques' : state.config.preset === 'voxel' ? 'Photo → blocs en relief' : state.config.preset === 'pixelsort' ? 'Photo → tri de pixels' : state.config.preset === 'granular' ? 'Photo → fragments animés' : state.config.preset === 'dither' ? 'Photo → trame numérique' : state.config.preset === 'relief' ? 'Photo → particules en relief' : 'Effets d’image';
  $('#engine-status').textContent = `${source} · prêt`;
  $('#preview-preset').textContent = `${source.toLocaleUpperCase('fr')} / ${presetNames[state.config.preset].toLocaleUpperCase('fr')}`;
  $('#image-timing').textContent = `1 image / ${Number(state.config.imageSeconds.toFixed(2))} s · ordre des fichiers`;
  $('#export-fps').value = state.config.fps;
  state.engine?.setConfig(state.config);
  updateSavedStatus();
}
function updateSavedStatus() {
  const button = $('#save-settings-button'); const status = $('#settings-save-status');
  button.disabled = !state.config || state.settingsSaving || !Object.hasOwn(presets, state.config.preset);
  status.classList.remove('error');
  if (state.settingsSaving) { status.textContent = 'Sauvegarde sur le serveur…'; return; }
  const record = state.savedSettings[state.config?.preset];
  if (!record) { status.textContent = 'Sauvegarder ces valeurs pour ce modèle, sur tous vos navigateurs LAN.'; return; }
  const matches = Object.entries(record.config).every(([key, value]) => state.config?.[key] === value);
  const date = new Date(record.savedAt).toLocaleString('fr-CA', { timeZone: 'America/Toronto' });
  status.textContent = matches ? `Sauvegardé sur le serveur · v${record.revision} · ${date}` : `Modifications non sauvegardées · dernière sauvegarde v${record.revision} · ${date}`;
}
async function refreshSavedSettings() {
  const saved = await api('/api/saved-settings'); state.savedSettings = saved.presets; updateSavedStatus();
}
$('#save-settings-button').addEventListener('click', async () => {
  if (!state.config || state.settingsSaving || !state.project) return;
  const config = { ...state.config }; const projectId = state.project.id;
  clearTimeout(saveTimer); state.settingsSaving = true; updateSavedStatus();
  let failure;
  try {
    await api(`/api/projects/${projectId}/config`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) });
    const record = await api(`/api/saved-settings/${config.preset}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, config }) });
    state.savedSettings[config.preset] = record;
  } catch (error) { failure = error; }
  finally {
    state.settingsSaving = false; updateSavedStatus();
    if (failure) { $('#settings-save-status').textContent = `Sauvegarde échouée : ${failure.message}`; $('#settings-save-status').classList.add('error'); }
  }
});
function updateOutput(key) {
  const output = document.querySelector(`[data-output="${key}"]`); if (!output) return;
  const value = state.config[key];
  output.textContent = ['orbitAmplitude','orbitKick'].includes(key) ? Number(value.toFixed(2))+'°' : key === 'advPitch' ? Number(value.toFixed(2))+' px' : ['orbitReturn', 'dataReturn', 'lamReturn', 'advReturn', 'portalReturn'].includes(key) ? Math.round(value*1000)+' ms' : ['lamGain', 'advGain', 'portalGain'].includes(key) ? value.toFixed(2)+'×' : key === 'wfHistory' ? value.toFixed(2) + ' s' : key === 'glowFloor' || key === 'glowBands' ? String(value) : key === 'glowPeakDrop' ? value.toFixed(3) : key === 'glowGain' ? value.toFixed(2) + '×' : key === 'radarDensity' ? `${Math.round(value)} · ${Number((1101.6/value).toFixed(1))} px` : ['dataDensity', 'lamColumns', 'kinColumns', 'sculptDensity', 'pegDensity', 'moireColumns', 'shearColumns', 'chronoColumns', 'vectorDensity', 'quadBase', 'specColumns', 'pressColumns', 'circuitColumns', 'corruptColumns', 'tileColumns', 'inlayColumns', 'crystalColumns', 'feedbackColumns', 'weaveColumns', 'codecColumns', 'plexDensity', 'binaryColumns', 'facetColumns'].includes(key) ? `${Math.round(value)} · ${key === 'crystalColumns' ? '≈ ' : ''}${Number((1920 / value).toFixed(1))} px` : key === 'morphDuration' ? `${value.toFixed(1)} s` : key === 'bendOffset' ? `${Math.round(value)} octets` : ['lamAngle', 'opticsAngle', 'pressAngle'].includes(key) ? `${Math.round(value)}°` : key === 'grainDensity' ? `${Math.round(value)} / s` : ['chronoDelay', 'glitchRelease', 'grainDuration', 'stutterDuration', 'echoDelay'].includes(key) ? `${Math.round(value * 1000)} ms` : ['portalFrames', 'wfRows', 'holoLayers', 'quadLevels', 'glitchBands', 'reliefDensity', 'ditherLevels', 'voxelDensity', 'opticsFacets', 'traceDensity', 'stutterRepeats', 'topoLevels', 'bendBands', 'echoCount', 'ribbonCount', 'morphDensity', 'shardCells', 'cymDensity', 'tunnelPanels', 'etchRows', 'relicDensity', 'tileColumns', 'panelCount', 'rasterDensity', 'mirrorFolds', 'mirrorDensity', 'shockDensity', 'binaryLayers'].includes(key) ? `${Math.round(value)}` : ['edgeThickness', 'traceWidth', 'topoWidth'].includes(key) ? `${value.toFixed(1)} px` : ['neonHue', 'traceHue'].includes(key) ? `${Math.round(value * 360)}°` : ['ledSpacing', 'ditherPitch', 'microSize', 'asciiSize', 'hexSize', 'stippleSpacing'].includes(key) ? `${Math.round(value)} px` : ['sensitivity', 'plexReach', 'shockSpeed', 'glitchAttack', 'asciiDensity', 'stippleDensity'].includes(key) ? `${value.toFixed(2)}×` : key === 'kaleidoscope' ? value >= 2 ? `${value} FACETTES` : 'OFF' : `${Math.round(value * 100)} %`;
}
let saveTimer;
function saveConfig() {
  clearTimeout(saveTimer);
  const projectId = state.project?.id; const config = { ...state.config };
  if (projectId) saveTimer = setTimeout(() => api(`/api/projects/${projectId}/config`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) }).catch(error => toast(`Réglages non enregistrés : ${error.message}`)), 400);
}
document.querySelectorAll('[data-config]').forEach(input => input.addEventListener('input', () => {
  if (!state.config) return;
  const key = input.dataset.config; state.config[key] = ['fit','audioResponse'].includes(key) ? input.value : Number(input.value);
  if (key === 'kaleidoscope' && state.config[key] === 1) state.config[key] = 0;
  updateOutput(key); state.engine?.setConfig(state.config); state.needsDraw = true;
  $('#image-timing').textContent = `1 image / ${Number(state.config.imageSeconds.toFixed(2))} s · ordre des fichiers`;
  updateSavedStatus();
  saveConfig();
}));
function applyPreset(preset, { original = false } = {}) {
  if (!state.config) { toast('Importe tes médias pour essayer les modèles.'); return; }
  state.config = { ...state.config, ...(original ? presets[preset] : state.savedSettings[preset]?.config || presets[preset]), preset }; syncControls(); state.needsDraw = true; saveConfig();
}
let modelSelection = 0;
document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', async () => {
  const selection = ++modelSelection;
  try { await refreshSavedSettings(); if (selection === modelSelection) applyPreset(button.dataset.preset); }
  catch (error) { toast(`Réglages partagés indisponibles : ${error.message}`); }
}));
$('#reset-button').addEventListener('click', () => { ++modelSelection; if (state.config) applyPreset(state.config.preset, { original: true }); });
window.addEventListener('focus', () => { if (state.project) void refreshSavedSettings().catch(() => {}); });
$('#export-fps').addEventListener('change', () => { if (state.config) { state.config.fps = Number($('#export-fps').value); saveConfig(); updateSavedStatus(); } });
$('#play-button').addEventListener('click', async () => { try { if (audio.paused) await audio.play(); else audio.pause(); } catch { toast('Impossible de lire la piste. Recharge la session.'); } });
$('#restart-button').addEventListener('click', () => { audio.currentTime = 0; state.needsDraw = true; });
$('#seek').addEventListener('input', event => { audio.currentTime = Number(event.target.value); state.needsDraw = true; });
$('#volume').addEventListener('input', event => { audio.volume = Number(event.target.value); });
audio.addEventListener('play', () => {
  $('#play-button').textContent = 'Ⅱ'; $('#play-button').setAttribute('aria-label', 'Pause');
  previewPerformance = { start: performance.now(), frames: 0 }; $('#preview-stats').textContent = 'Mesure en cours…';
});
audio.addEventListener('pause', () => { $('#play-button').textContent = '▶'; $('#play-button').setAttribute('aria-label', 'Lire'); });
audio.addEventListener('seeked', () => { state.needsDraw = true; });
audio.addEventListener('ended', () => { state.needsDraw = true; });
audio.addEventListener('error', () => { if (state.project) toast('La piste audio n’est plus accessible.'); });
$('#fullscreen-button').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen?.(); else $('#preview-shell').requestFullscreen?.().catch(() => toast('Le plein écran n’est pas disponible dans ce navigateur.'));
});
function drawWaveform(time) {
  const canvas = $('#waveform'); const rect = canvas.getBoundingClientRect(); const ratio = window.devicePixelRatio || 1;
  if (canvas.width !== Math.floor(rect.width * ratio) || canvas.height !== Math.floor(rect.height * ratio)) { canvas.width = Math.floor(rect.width * ratio); canvas.height = Math.floor(rect.height * ratio); }
  const ctx = canvas.getContext('2d'); const w = canvas.width; const h = canvas.height; ctx.clearRect(0, 0, w, h);
  const wave = state.analysis?.wave; const progress = state.project ? time / state.project.audio.duration : 0;
  if (!wave) { ctx.fillStyle = '#2a313e'; ctx.fillRect(0, h / 2, w, ratio); return; }
  const bars = Math.max(1, Math.floor(rect.width / 3));
  for (let i = 0; i < bars; i++) { const level = wave[Math.floor(i / bars * wave.length)] || 0; const height = Math.max(ratio * 2, level * h * .85); ctx.fillStyle = i / bars < progress ? '#c5f77d' : '#434e61'; ctx.fillRect(i / bars * w, (h - height) / 2, Math.max(1, w / bars - ratio), height); }
}
async function tick(timestamp) {
  requestAnimationFrame(tick);
  if (state.drawing || !state.engine || (!state.needsDraw && audio.paused) || timestamp + .5 < state.nextFrame) return;
  state.drawing = true; state.nextFrame = nextPreviewDeadline(state.nextFrame, timestamp, previewModes[state.previewMode].fps); state.needsDraw = false;
  try {
    const time = audio.currentTime || 0; const result = await state.engine.draw(time);
    $('#current-time').textContent = timeLabel(time); $('#seek').value = time;
    drawWaveform(time);
    for (const band of ['bass', 'mid', 'high']) $(`#${band}-meter`).style.transform = `scaleX(${Math.min(1, result?.[band] || 0)})`;
    const cards = $('#image-list').children;
    for (let i = 0; i < cards.length; i++) cards[i].classList.toggle('active', i === result?.index);
    if (!audio.paused) {
      previewPerformance.frames++;
      const elapsed = performance.now() - previewPerformance.start;
      if (elapsed >= 1000) {
        const fps = Math.round(previewPerformance.frames * 1000 / elapsed);
        const target = previewModes[state.previewMode].fps;
        $('#preview-stats').textContent = `${fps} / ${target} i/s`;
        $('#preview-stats').classList.toggle('slow', fps < target * .7);
        previewPerformance = { start: performance.now(), frames: 0 };
      }
    }
  } catch (error) { audio.pause(); toast(`Aperçu : ${error.message}`); }
  finally { state.drawing = false; }
}
requestAnimationFrame(tick);
window.addEventListener('resize', () => { drawWaveform(audio.currentTime); state.needsDraw = true; });

$('#lan-button').addEventListener('click', () => $('#lan-dialog').showModal());
$('#export-button').addEventListener('click', () => $('#export-dialog').showModal());
$('#start-export').addEventListener('click', async () => {
  if (!state.project || state.job) return;
  $('#start-export').disabled = true; $('#download-export').hidden = true;
  try {
    const config = { ...state.config, fps: Number($('#export-fps').value) };
    const job = await api(`/api/projects/${state.project.id}/exports`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) });
    state.job = job.id; localStorage.setItem('musicframe-render-export', job.id);
    await watchExport(job.id);
  } catch (error) { toast(error.message); }
  finally { $('#start-export').disabled = false; }
});
async function watchExport(id) {
  state.job = id; $('#export-progress').hidden = false; $('#start-export').hidden = true; $('#cancel-export').hidden = false;
  try {
    let job;
    do {
      job = await api(`/api/exports/${id}`);
      $('#export-message').textContent = job.message; $('#export-percent').textContent = `${job.progress} %`; $('#export-bar').value = job.progress;
      $('#export-frames').textContent = job.totalFrames ? `${job.frames.toLocaleString('fr')} / ${job.totalFrames.toLocaleString('fr')} images` : 'Initialisation du moteur';
      if (['starting', 'rendering', 'encoding'].includes(job.status)) await wait(1000);
    } while (['starting', 'rendering', 'encoding'].includes(job.status));
    if (job.status === 'completed') { $('#download-export').href = job.downloadUrl; $('#download-export').hidden = false; $('#export-frames').textContent = `1080p · stéréo · ${(job.result.size / 1024 / 1024).toFixed(1)} Mo`; }
    else if (job.status === 'error') toast(job.error || 'L’export a échoué.');
  } catch (error) { toast(error.message); }
  finally { state.job = null; localStorage.removeItem('musicframe-render-export'); $('#cancel-export').hidden = true; $('#start-export').hidden = false; }
}
$('#cancel-export').addEventListener('click', async () => { if (!state.job) return; try { await api(`/api/exports/${state.job}/cancel`, { method: 'POST' }); } catch (error) { toast(error.message); } });
for (const dialog of document.querySelectorAll('dialog')) dialog.addEventListener('click', event => { if (event.target === dialog && event.offsetX >= 0 && event.offsetY >= 0) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });

async function initialize() {
  try {
    const status = await api('/api/status');
    state.defaults = status.defaults;
    const addresses = $('#lan-addresses');
    for (const item of status.lan) { const link = document.createElement('a'); link.href = item.url; link.textContent = item.url; link.target = '_blank'; link.rel = 'noopener'; addresses.append(link); }
    if (!status.lan.length) addresses.textContent = 'Aucune adresse réseau local détectée. Vérifie la connexion réseau de cette machine.';
    if (!status.ffmpeg) { $('#engine-status').textContent = 'FFmpeg à installer'; toast('FFmpeg est requis sur le serveur avant d’importer des médias.'); }
    await refreshSavedSettings();
    await refreshProjects();
    let reference;
    try { reference = await api('/api/reference'); } catch (error) { toast(error.message); }
    if (reference) {
      $('#reference-sources').hidden = false;
      $('#reference-files').textContent = `${reference.audioName} + ${reference.imagesName}`;
      await openReference(reference);
    } else {
      const last = localStorage.getItem('musicframe-render-project');
      if (last) { try { const project = await api(`/api/projects/${last}`); if (project.status === 'ready') { await openProject(project); $('#recent-projects').value = last; } } catch { localStorage.removeItem('musicframe-render-project'); } }
    }
    const job = localStorage.getItem('musicframe-render-export'); if (job) void watchExport(job);
    drawWaveform(0);
  } catch (error) { toast(`Connexion au studio impossible : ${error.message}`); }
}
initialize();
