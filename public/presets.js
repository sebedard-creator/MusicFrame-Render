// Active product presets. Retired models remain readable in legacy projects.
export const presets = Object.freeze({
  // Accepted: Rotation orbitale, shared server save v1.
  orbit: Object.freeze({"intensity":1,"zoom":0,"distortion":0,"rgb":0.07,"kaleidoscope":0,"speed":1,"sensitivity":1.9,"fps":60,"orbitAmplitude":7,"orbitKick":2.5,"orbitMode":0,"orbitCenterX":0.5,"orbitCenterY":0.5,"orbitGrain":0.72,"orbitReturn":0.38,"orbitReaction":1}),
  // Accepted: Essaim de données, shared server save v1.
  dataGrains: Object.freeze({"intensity":1,"zoom":0,"distortion":0,"rgb":0.15,"kaleidoscope":0,"speed":1,"sensitivity":1.9,"fps":60,"dataDensity":800,"dataSize":0.44,"dataFlow":0.8,"dataDepth":0.8,"dataTrail":0.65,"dataTint":0,"dataBackground":0.29,"dataReturn":0.22,"dataReaction":1}),
  // Accepted: user server save, Strates holographiques v1.
  holo: Object.freeze({"intensity":1,"zoom":0.2,"distortion":0,"rgb":0.23,"kaleidoscope":0,"speed":1,"sensitivity":1.9,"fps":60,"holoLayers":44,"holoDepth":1,"holoOrbit":1,"holoPhoto":1,"holoLines":0,"holoTint":0,"holoScan":1,"holoReaction":1}),
  stereoGlow: Object.freeze({"intensity":1,"zoom":0,"distortion":0,"rgb":0,"kaleidoscope":0,"speed":1,"sensitivity":1.95,"glowPhoto":0,"glowBands":80,"glowSpace":0,"glowLight":0.37,"glowStereo":0,"glowLed":0,"glowLumi":0,"glowRadial":0,"glowRotation":0,"glowPeaks":0,"glowPeakDrop":0.99,"glowGradient":0,"glowDirection":0,"glowColorMode":0,"glowFloor":27,"glowSmoothing":0.21,"glowGain":1.2,"glowHeight":0.32,"glowPosition":0.97,"glowOpacity":0.57,"fps":60}),
  // Retained from the user's server save, Matrice LED v3 (2026-10-19).
  led: Object.freeze({ intensity: 1, zoom: 1, distortion: 0, rgb: 1, kaleidoscope: 0, speed: 1, sensitivity: 2.45, ledSpacing: 9, ledFill: .29, ledGlow: .38 }),
  // User's server save, Relief granulaire v1 (2026-10-19).
  relief: Object.freeze({ intensity: .52, zoom: .58, distortion: 0, rgb: .13, kaleidoscope: 0, speed: 1, sensitivity: 1.75, reliefDensity: 300, reliefDepth: .53, reliefSize: 1.03, reliefOrbit: 1 }),
  // User’s server save, Trame numérique v1 (2026-10-19).
  dither: Object.freeze({ intensity: 1, zoom: 0.84, distortion: 0, rgb: 0.45, kaleidoscope: 0, speed: 1, sensitivity: 3, ditherPitch: 2, ditherLevels: 2, ditherMix: 1, ditherReaction: 1, ditherPalette: 0, ditherScan: 1 }),
  // User’s server save, Tri spectral v1 (2026-10-19).
  pixelsort: Object.freeze({ intensity: 1, zoom: 0.2, distortion: 0, rgb: 0.5, kaleidoscope: 0, speed: 1, sensitivity: 1.75, sortThreshold: 0.12, sortLength: 1, sortDirection: 1, sortReverse: 1, sortMix: 0.7, fps: 60 }),
  // User’s server save, Mosaïque voxel v1 (2026-10-19).
  voxel: Object.freeze({ intensity: 1, zoom: 0.3, distortion: 0, rgb: 0.37, kaleidoscope: 0, speed: 1, sensitivity: 1.95, voxelDensity: 140, voxelDepth: 0.36, voxelFill: 0.49, voxelTilt: 1, voxelGlow: 0, fps: 60 }),
  // User’s server save, Écran matriciel v1 (2026-10-19).
  ascii: Object.freeze({ intensity: 1, zoom: 0.55, distortion: 0, rgb: 0.21, kaleidoscope: 0, speed: 1, sensitivity: 2.2, asciiSize: 20, asciiDensity: 1.8, asciiReaction: 0.43, asciiGlow: 0, asciiRain: 0, asciiPalette: 0, fps: 60 }),
  // User’s server save, Tube cathodique v1.
  crt: Object.freeze({"intensity": 1, "zoom": 0.95, "distortion": 0, "rgb": 0.16, "kaleidoscope": 0, "speed": 1, "sensitivity": 3, "crtCurve": 0.19, "crtLines": 1, "crtGlow": 1, "crtFringe": 1, "crtNoise": 1, "crtReaction": 1, "fps": 60}),
  // User’s server save, Pointillisme granulaire v1.
  stipple: Object.freeze({"intensity": 1, "zoom": 0.48, "distortion": 0, "rgb": 0.6, "kaleidoscope": 0, "speed": 1, "sensitivity": 2.1, "stippleSpacing": 4, "stippleSize": 0.12, "stippleDensity": 2, "stippleReaction": 1, "stippleScatter": 1, "stippleBackground": 0.22, "stipplePalette": 0, "fps": 60}),
  // User’s server save, Morphose granulaire v1.
  morph: Object.freeze({"intensity": 1, "zoom": 0.47, "distortion": 0, "rgb": 0.53, "kaleidoscope": 0, "speed": 1, "sensitivity": 1.1, "morphDensity": 360, "morphSize": 0.85, "morphScatter": 0.45, "morphStagger": 0.8, "morphDuration": 0.2, "morphThreshold": 0.4, "fps": 60}),
  // User’s server save, Cymatique photo v1.
  cymatics: Object.freeze({"intensity": 1, "zoom": 0.15, "distortion": 0, "rgb": 1, "kaleidoscope": 0, "speed": 1, "sensitivity": 2.1, "cymDensity": 170, "cymSize": 0.65, "cymAttraction": 0.3, "cymRotation": 1, "cymBackground": 0, "cymMode": 5, "fps": 60}),
  // User’s server save, Décodage numérique v1.
  tessera: Object.freeze({"intensity": 1, "zoom": 1, "distortion": 0, "rgb": 0.44, "kaleidoscope": 0, "speed": 1, "sensitivity": 2.5, "tileColumns": 480, "tileObscure": 1, "tileEdges": 0.26, "tileFlash": 1, "tileDirection": 0, "tileReaction": 1, "fps": 60}),
  // User’s server save, Fenêtres de signal v2.
  fenestra: Object.freeze({"intensity": 1, "zoom": 0.2, "distortion": 0, "rgb": 0.39, "kaleidoscope": 0, "speed": 1, "sensitivity": 2, "panelCount": 48, "panelMagnify": 1, "panelEdges": 0, "panelLinks": 0, "panelBackground": 0.27, "panelReaction": 1, "fps": 60}),
  // User’s server save, Nuage numérique v1.
  raster: Object.freeze({"intensity": 1, "zoom": 0.2, "distortion": 0, "rgb": 0, "kaleidoscope": 0, "speed": 1, "sensitivity": 2.1, "rasterDensity": 400, "rasterSize": 0.65, "rasterScatter": 0.6, "rasterRadial": 0.35, "rasterWave": 0.12, "rasterBackground": 0.1, "fps": 60}),
  // User’s server save, Codec granulaire v1.
  codec: Object.freeze({"intensity":1,"zoom":0.45,"distortion":0,"rgb":0.28,"kaleidoscope":0,"speed":1,"sensitivity":2.75,"fps":60,"codecCrush":0.98,"codecColumns":863,"codecShift":0.73,"codecChroma":0.4,"codecReaction":1,"codecMix":0.86}),
  // User’s server save, Plexus photo v1.
  plexus: Object.freeze({"intensity":1,"zoom":0.51,"distortion":0,"rgb":0.08,"kaleidoscope":0,"speed":1,"sensitivity":3,"fps":60,"plexDensity":190,"plexSize":0.24,"plexLinks":0.8,"plexSpread":0.4,"plexReach":3,"plexBackground":0.17}),
  // User’s server save, Spectre granulaire v2.
  spectrum: Object.freeze({"intensity":1,"zoom":0.29,"distortion":0,"rgb":0.19,"kaleidoscope":0,"speed":1,"sensitivity":3,"fps":60,"specColumns":368,"specFill":0.6,"specTravel":0.6,"specGlow":0.34,"specBackground":0,"specReaction":1}),
  // User’s server save, Scan temporel v1.
  chrono: Object.freeze({"intensity":1,"zoom":0.42,"distortion":0,"rgb":0.22,"kaleidoscope":0,"speed":1,"sensitivity":3,"fps":60,"chronoColumns":640,"chronoDelay":0,"chronoShift":1,"chronoTwist":1,"chronoChroma":0.45,"chronoReaction":1}),
});
// Rejected candidates stay readable in old project files, outside the active catalog.
export const legacyPresets = Object.freeze({
  lamella: Object.freeze({intensity:1,zoom:0,distortion:0,rgb:0,kaleidoscope:0,speed:1,sensitivity:1.9,fps:60,lamColumns:160,lamTravel:.7,lamFold:.8,lamLight:.65,lamGrain:.45,lamAngle:12,lamReturn:.24,lamGain:1.5,lamReaction:1}),
  advection: Object.freeze({intensity:1,zoom:0,distortion:0,rgb:0,kaleidoscope:0,speed:1,sensitivity:1.9,fps:60,advPitch:2,advFlow:.9,advDepth:.65,advTrail:.6,advGrain:.8,advChroma:.2,advReturn:.16,advGain:1.6,advReaction:1}),
  portal: Object.freeze({intensity:1,zoom:0,distortion:0,rgb:0,kaleidoscope:0,speed:1,sensitivity:1.9,fps:60,portalFrames:14,portalDepth:.9,portalTwist:.5,portalTilt:.6,portalGlow:.5,portalBackground:.15,portalReturn:.14,portalGain:1.6,portalThreshold:.35,portalReaction:1}),
  wavefield: Object.freeze({intensity:1,zoom:.2,distortion:0,rgb:0,kaleidoscope:0,speed:1,sensitivity:1.9,fps:60,wfRows:128,wfFill:.6,wfDepth:.75,wfRipple:.7,wfAngle:.65,wfHistory:1.25,wfGlow:.5,wfTint:.15,wfBackground:.12,wfReaction:1}),

  kinetic: Object.freeze({intensity:1,zoom:.2,distortion:0,rgb:0,kaleidoscope:0,speed:1,sensitivity:1.9,fps:60,kinColumns:48,kinDepth:.8,kinSpread:.7,kinSpin:.7,kinFlow:.8,kinGlow:.4,kinBackground:.1,kinReaction:1}),

  sculpt: Object.freeze({ intensity:1, zoom:.25, distortion:0, rgb:0, kaleidoscope:0, speed:1, sensitivity:1.9, fps:60, sculptDepth:.65, sculptOrbit:.75, sculptSmooth:.45, sculptLight:.7, sculptFacets:.15, sculptWave:.4, sculptReaction:1, sculptDensity:200 }),

  pulse: Object.freeze({ intensity: 1, zoom: 1, distortion: .16, rgb: 1, kaleidoscope: 0, speed: 1, sensitivity: 1.95 }),
  phase: Object.freeze({"intensity": 1, "zoom": 0.46, "distortion": 0, "rgb": 0.36, "kaleidoscope": 0, "speed": 1, "sensitivity": 2.1, "phaseSlices": 1, "phaseBlocks": 1, "phaseShift": 1, "phaseChroma": 0.96, "phaseNoise": 0.25, "phaseReaction": 1, "fps": 60}),
  intarsia: Object.freeze({"intensity": 1, "zoom": 0.2, "distortion": 0, "rgb": 0.12, "kaleidoscope": 0, "speed": 1, "sensitivity": 2.25, "inlayColumns": 412, "inlayFill": 0.2, "inlayDensity": 0.85, "inlayGlow": 1, "inlayReaction": 1, "inlayBackground": 0, "fps": 60}),
  feedback: Object.freeze({"intensity":1,"zoom":0.2,"distortion":0,"rgb":0,"kaleidoscope":0,"speed":1,"sensitivity":2.1,"fps":60,"feedbackMemory":0.76,"feedbackShift":0.83,"feedbackColumns":699,"feedbackChroma":0.45,"feedbackPhoto":0.67}),

  pegboard: Object.freeze({ intensity: 1, zoom: .2, distortion: 0, rgb: 0, kaleidoscope: 0, speed: 1, sensitivity: 2.1, pegDensity: 240, pegSize: .6, pegPalette: .6, pegDither: .8, pegThreshold: .22, pegPop: .6, pegReaction: 1 }),
  moire: Object.freeze({ intensity: 1, zoom: .2, distortion: 0, rgb: 0, kaleidoscope: 0, speed: 1, sensitivity: 2.1, moireColumns: 240, moireAngle: .35, moireDepth: .8, moireChroma: .35, moireReaction: 1, moireMix: .9 }),
  shear: Object.freeze({ intensity: 1, zoom: .2, distortion: 0, rgb: 0, kaleidoscope: 0, speed: 1, sensitivity: 2.1, shearColumns: 384, shearStretch: .45, shearTilt: .4, shearChroma: .45, shearLayout: 1, shearReaction: 1 }),
  vector: Object.freeze({ intensity: 1, zoom: .2, distortion: 0, rgb: 0, kaleidoscope: 0, speed: 1, sensitivity: 2.1, vectorDensity: 240, vectorLength: .7, vectorWidth: .5, vectorTurn: .8, vectorBackground: .12, vectorReaction: 1 }),
  quadtree: Object.freeze({ intensity: 1, zoom: .2, distortion: 0, rgb: 0, kaleidoscope: 0, speed: 1, sensitivity: 2.1, quadBase: 64, quadLevels: 4, quadDetail: .65, quadEdges: .35, quadReaction: 1, quadMix: 1 }),
  radar: Object.freeze({ intensity: 1, zoom: .2, distortion: 0, rgb: 0, kaleidoscope: 0, speed: .65, sensitivity: 2.1, radarDensity: 240, radarSize: .7, radarSweep: .85, radarTrail: .35, radarBackground: .1, radarReaction: 1 }),
  press: Object.freeze({ intensity: 1, zoom: .2, distortion: 0, rgb: 0, kaleidoscope: 0, speed: 1, sensitivity: 2.1, pressColumns: 240, pressInk: 1, pressRegister: .65, pressAngle: 0, pressReaction: 1, pressMix: 1 }),
  circuit: Object.freeze({ intensity: 1, zoom: .2, distortion: 0, rgb: 0, kaleidoscope: 0, speed: .65, sensitivity: 2.1, circuitColumns: 240, circuitWidth: .22, circuitGlow: .5, circuitTint: .4, circuitBackground: .08, circuitReaction: 1 }),
  corruption: Object.freeze({ intensity: 1, zoom: .2, distortion: 0, rgb: 0, kaleidoscope: 0, speed: 1, sensitivity: 2.1, corruptProfile: 1, corruptColumns: 320, corruptCoverage: .7, corruptChroma: 1, corruptReaction: 1, corruptMix: .85 }),
  facets: Object.freeze({ intensity: 1, zoom: .2, distortion: 0, rgb: 0, kaleidoscope: 0, speed: .65, sensitivity: 2.1, facetColumns: 180, facetRotation: .7, facetRelief: .4, facetLighting: .55, facetGap: .08, facetBackground: .12, facetReaction: 1 }),
  binary: Object.freeze({ intensity: 1, zoom: .2, distortion: 0, rgb: 0, kaleidoscope: 0, speed: .7, sensitivity: 2.1, binaryColumns: 480, binaryLayers: 6, binaryShift: .65, binaryChroma: .45, binaryReaction: 1, binaryMix: .85 }),
  weave: Object.freeze({ intensity: 1, zoom: .2, distortion: 0, rgb: 0, kaleidoscope: 0, speed: .65, sensitivity: 2.1, weaveColumns: 240, weaveFill: .28, weaveTension: .6, weaveTint: .5, weaveMemory: .4, weaveMix: 1 }),
  shock: Object.freeze({ intensity: 1, zoom: .2, distortion: 0, rgb: .08, kaleidoscope: 0, speed: 1, sensitivity: 2.1, shockDensity: 400, shockSize: .6, shockAmplitude: .75, shockWidth: .35, shockSpeed: 1, shockBackground: .1 }),
  mirrorgrain: Object.freeze({ intensity: 1, zoom: .2, distortion: 0, rgb: .15, kaleidoscope: 0, speed: .65, sensitivity: 2.1, mirrorFolds: 6, mirrorScale: .35, mirrorDensity: 320, mirrorFill: .7, mirrorRotation: .25, mirrorReaction: 1 }),
  crystal: Object.freeze({ intensity: 1, zoom: .2, distortion: 0, rgb: .08, kaleidoscope: 0, speed: .65, sensitivity: 2.1, crystalColumns: 180, crystalEdges: .2, crystalMotion: .5, crystalPulse: 1, crystalSaturation: 1, crystalMix: 1 }),
  reliquary: Object.freeze({ intensity: 1, zoom: .15, distortion: 0, rgb: .15, kaleidoscope: 0, speed: .65, sensitivity: 2.1, relicDensity: 240, relicSize: .55, relicLength: .7, relicShed: .95, relicBurst: 1, relicBody: .8 }),
  etch: Object.freeze({ intensity: 1, zoom: .2, distortion: 0, rgb: .12, kaleidoscope: 0, speed: .6, sensitivity: 2.1, etchRows: 110, etchSwing: .75, etchWeight: .65, etchColor: .65, etchReaction: 1, etchBackground: .05 }),
  tunnel: Object.freeze({ intensity: 1, zoom: .2, distortion: 0, rgb: .1, kaleidoscope: 0, speed: .65, sensitivity: 2.1, tunnelPanels: 8, tunnelDepth: .4, tunnelTwist: .55, tunnelGrid: .35, tunnelPhoto: .9, tunnelReaction: 1 }),
  shards: Object.freeze({ intensity: 1, zoom: .2, distortion: 0, rgb: .12, kaleidoscope: 0, speed: 1, sensitivity: 2.1, shardCells: 32, shardSpread: .7, shardTwist: .55, shardBurst: .8, shardEdges: .15, shardBackground: 0 }),
  ribbons: Object.freeze({ intensity: 1, zoom: .2, distortion: 0, rgb: .2, kaleidoscope: 0, speed: 1, sensitivity: 2.1, ribbonCount: 48, ribbonStretch: .85, ribbonDrift: .3, ribbonMix: 1, ribbonReaction: 1, ribbonDirection: 2 }),
  echo: Object.freeze({ intensity: 1, zoom: .25, distortion: 0, rgb: .15, kaleidoscope: 0, speed: 1, sensitivity: 2.1, echoCount: 6, echoDelay: .075, echoDecay: .78, echoSpread: .8, echoMix: .85, echoChroma: 1, echoReaction: 1 }),
  databend: Object.freeze({ intensity: 1, zoom: .2, distortion: 0, rgb: 0, kaleidoscope: 0, speed: .65, sensitivity: 2.1, bendMode: 3, bendOffset: 257, bendMix: .95, bendBands: 32, bendReaction: 1 }),
  topography: Object.freeze({ intensity: 1, zoom: .2, distortion: 0, rgb: .05, kaleidoscope: 0, speed: .65, sensitivity: 1.95, topoLevels: 12, topoWidth: 1.2, topoContrast: .55, topoReaction: .8, topoScan: .4, topoBackground: .2, topoPalette: 2 }),
  stutter: Object.freeze({ intensity: 1, zoom: .2, distortion: 0, rgb: .5, kaleidoscope: 0, speed: 1, sensitivity: 2.1, stutterDuration: .32, stutterRepeats: 3, stutterPunch: .65, stutterShift: .45, stutterEcho: .35, stutterContrast: .3 }),
  hex: Object.freeze({ intensity: 1, zoom: .25, distortion: 0, rgb: .1, kaleidoscope: 0, speed: .7, sensitivity: 1.95, hexSize: 24, hexFill: .82, hexEdges: .35, hexRelief: .5, hexReaction: .8, hexMix: 1 }),
  micro: Object.freeze({ intensity: 1, zoom: .2, distortion: 0, rgb: .1, kaleidoscope: 0, speed: .7, sensitivity: 2, microSize: 10, microSpread: .6, microDensity: .75, microThreshold: .05, microBackground: .85, microMode: 0 }),
  trace: Object.freeze({ intensity: 1, zoom: .25, distortion: 0, rgb: .08, kaleidoscope: 0, speed: .65, sensitivity: 1.95, traceDensity: 88, traceDepth: .65, traceWidth: 1.6, traceTilt: .55, traceHue: .49, traceMesh: 1 }),
  interference: Object.freeze({ intensity: 1, zoom: .2, distortion: 0, rgb: 0, kaleidoscope: 0, speed: .55, sensitivity: 1.95, opticsDispersion: .7, opticsRefraction: .45, opticsFacets: 24, opticsLines: .3, opticsCoating: .6, opticsAngle: 45 }),
  granular: Object.freeze({ intensity: 1, zoom: .25, distortion: 0, rgb: .12, kaleidoscope: 0, speed: .55, sensitivity: 2, grainDensity: 55, grainDuration: .42, grainSize: .18, grainScatter: .55, grainRotation: .25, grainBackground: .55 }),
  fracture: Object.freeze({ intensity: .9, zoom: .5, distortion: 0, rgb: .7, kaleidoscope: 0, speed: .65, sensitivity: 1.8, glitchBands: 28, glitchShift: .65, glitchBlocks: .55, glitchGrain: .09, glitchAttack: 1.4, glitchRelease: .18 }),
  neon: Object.freeze({ intensity: .9, zoom: .4, distortion: 0, rgb: .5, kaleidoscope: 0, speed: .55, sensitivity: 1.6, edgeThickness: 2.2, neonHue: .53, edgeBrightness: .65 }),
});
// Legacy names remain readable in previously saved sessions.
export const presetNames = { orbit: 'Rotation orbitale', dataGrains: 'Essaim de données', lamella: 'Lamelles de phase', advection: 'Flux microgranulaire', portal: 'Portail rythmique 3D', wavefield: 'Ondes filaires 3D', kinetic: 'Flux prismatique 3D', holo: 'Strates holographiques', sculpt: 'Photo sculptée 3D', stereoGlow: 'Stereo glow', pegboard: 'Panneau lumineux', moire: 'Moiré numérique', shear: 'Cisaillement spectral', chrono: 'Scan temporel', vector: 'Champ vectoriel', quadtree: 'Pixels fractals', radar: 'Radar granulaire', spectrum: 'Spectre granulaire', press: 'Trame CMJN', circuit: 'Circuits photo', corruption: 'Corruption JPEG', facets: 'Facettes cinétiques', binary: 'Déphasage binaire', plexus: 'Plexus photo', codec: 'Codec granulaire', weave: 'Tissage spectral', feedback: 'Mémoire vidéo', shock: 'Ondes d’impact', mirrorgrain: 'Prisme granulaire', crystal: 'Mosaïque cristalline', raster: 'Nuage numérique', intarsia: 'Mosaïque active', fenestra: 'Fenêtres de signal', tessera: 'Décodage numérique', reliquary: 'Éjection granulaire', etch: 'Oscillographe photo', tunnel: 'Tunnel photographique', cymatics: 'Cymatique photo', shards: 'Éclats polygonaux', morph: 'Morphose granulaire', ribbons: 'Rubans numériques', echo: 'Écho cinétique', phase: 'Signal industriel', stipple: 'Pointillisme granulaire', databend: 'Databending', crt: 'Tube cathodique', topography: 'Topographie numérique', pulse: 'Pulsation', led: 'Matrice LED', relief: 'Relief granulaire', dither: 'Trame numérique', granular: 'Fragments granulaires', pixelsort: 'Tri spectral', voxel: 'Mosaïque voxel', interference: 'Interférences chromatiques', trace: 'Tracé vectoriel', micro: 'Micro-mosaïque', ascii: 'Écran matriciel', hex: 'Trame hexagonale', stutter: 'Stutter numérique', fracture: 'Fracture numérique', neon: 'Contours néon', prism: 'Prisme', spectral: 'Spectral' };

// Persisted glowPhoto numbers are stable across catalog removals. Never renumber.
export const photoModelIds = Object.freeze(['pulse', 'led', 'relief', 'dither', 'pixelsort', 'voxel', 'ascii', 'crt', 'stipple', 'phase', 'morph', 'cymatics', 'tessera', 'fenestra', 'intarsia', 'raster', 'feedback', 'codec', 'plexus', 'spectrum', 'chrono', 'sculpt', 'holo', 'kinetic', 'wavefield', 'portal', 'advection', 'lamella', 'dataGrains', 'orbit']);
