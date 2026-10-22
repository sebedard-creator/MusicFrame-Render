import { presets, legacyPresets, photoModelIds } from '../public/presets.js';

export const defaults = Object.freeze({
  audioResponse: 'legacy',
  engine: 'astrofox', preset: 'led', ...presets.led,
  ...{"glowPhoto":0,"glowBands":80,"glowSpace":0.4,"glowLight":1,"glowStereo":1,"glowLed":0,"glowLumi":0,"glowRadial":0,"glowRotation":0,"glowPeaks":0,"glowPeakDrop":0.99,"glowGradient":0,"glowDirection":0,"glowColorMode":0,"glowFloor":65,"glowSmoothing":0.65,"glowGain":1,"glowHeight":0.32,"glowPosition":0.92,"glowOpacity":1},
  imageSeconds: 12, fit: 'cover', fps: 60,
  ledSpacing: presets.led.ledSpacing, ledFill: presets.led.ledFill, ledGlow: presets.led.ledGlow,
  edgeThickness: legacyPresets.neon.edgeThickness, neonHue: legacyPresets.neon.neonHue, edgeBrightness: legacyPresets.neon.edgeBrightness,
  glitchBands: legacyPresets.fracture.glitchBands, glitchShift: legacyPresets.fracture.glitchShift, glitchBlocks: legacyPresets.fracture.glitchBlocks, glitchGrain: legacyPresets.fracture.glitchGrain,
  reliefDensity: 220, reliefDepth: .65, reliefSize: .65, reliefOrbit: .55,
  sculptDepth:.65, sculptOrbit:.75, sculptSmooth:.45, sculptLight:.7, sculptFacets:.15, sculptWave:.4, sculptReaction:1, sculptDensity:200,
  holoLayers:16, holoDepth:.6, holoOrbit:.65, holoPhoto:.85, holoLines:.55, holoTint:.4, holoScan:.2, holoReaction:1,
  kinColumns:48, kinDepth:.8, kinSpread:.7, kinSpin:.7, kinFlow:.8, kinGlow:.4, kinBackground:.1, kinReaction:1,
  wfRows:128,wfFill:.6,wfDepth:.75,wfRipple:.7,wfAngle:.65,wfHistory:1.25,wfGlow:.5,wfTint:.15,wfBackground:.12,wfReaction:1,
  portalFrames:14,portalDepth:.9,portalTwist:.5,portalTilt:.6,portalGlow:.5,portalBackground:.15,portalReturn:.14,portalGain:1.6,portalThreshold:.35,portalReaction:1,
  orbitAmplitude:7,orbitKick:2.5,orbitMode:0,orbitCenterX:.5,orbitCenterY:.5,orbitGrain:.3,orbitReturn:.38,orbitReaction:1,
  dataDensity:480,dataSize:.65,dataFlow:.8,dataDepth:.8,dataTrail:.65,dataTint:.35,dataBackground:.035,dataReturn:.22,dataReaction:1,
  lamColumns:160,lamTravel:.7,lamFold:.8,lamLight:.65,lamGrain:.45,lamAngle:12,lamReturn:.24,lamGain:1.5,lamReaction:1,
  advPitch:2,advFlow:.9,advDepth:.65,advTrail:.6,advGrain:.8,advChroma:.2,advReturn:.16,advGain:1.6,advReaction:1,
  pegDensity: 240, pegSize: .6, pegPalette: .6, pegDither: .8, pegThreshold: .22, pegPop: .6, pegReaction: 1,
  moireColumns: 240, moireAngle: .35, moireDepth: .8, moireChroma: .35, moireReaction: 1, moireMix: .9,
  shearColumns: 384, shearStretch: .45, shearTilt: .4, shearChroma: .45, shearLayout: 1, shearReaction: 1,
  chronoColumns: 640, chronoDelay: .24, chronoShift: .75, chronoTwist: .6, chronoChroma: .45, chronoReaction: 1,
  vectorDensity: 240, vectorLength: .7, vectorWidth: .5, vectorTurn: .8, vectorBackground: .12, vectorReaction: 1,
  quadBase: 64, quadLevels: 4, quadDetail: .65, quadEdges: .35, quadReaction: 1, quadMix: 1,
  radarDensity: 240, radarSize: .7, radarSweep: .85, radarTrail: .35, radarBackground: .1, radarReaction: 1,
  specColumns: 240, specFill: .6, specTravel: .6, specGlow: .45, specBackground: .08, specReaction: 1,
  pressColumns: 240, pressInk: 1, pressRegister: .65, pressAngle: 0, pressReaction: 1, pressMix: 1,
  circuitColumns: 240, circuitWidth: .22, circuitGlow: .5, circuitTint: .4, circuitBackground: .08, circuitReaction: 1,
  corruptProfile: 1, corruptColumns: 320, corruptCoverage: .7, corruptChroma: 1, corruptReaction: 1, corruptMix: .85,
  facetColumns: 180, facetRotation: .7, facetRelief: .4, facetLighting: .55, facetGap: .08, facetBackground: .12, facetReaction: 1,
  binaryColumns: 480, binaryLayers: 6, binaryShift: .65, binaryChroma: .45, binaryReaction: 1, binaryMix: .85,
  plexDensity: 160, plexSize: .42, plexLinks: .8, plexSpread: .4, plexReach: 2.2, plexBackground: .12,
  codecCrush: .85, codecColumns: 240, codecShift: .4, codecChroma: .35, codecReaction: 1, codecMix: 1,
  weaveColumns: 240, weaveFill: .28, weaveTension: .6, weaveTint: .5, weaveMemory: .4, weaveMix: 1,
  feedbackMemory: .76, feedbackShift: .65, feedbackColumns: 320, feedbackChroma: .45, feedbackPhoto: .8,
  shockDensity: 400, shockSize: .6, shockAmplitude: .75, shockWidth: .35, shockSpeed: 1, shockBackground: .1,
  mirrorFolds: 6, mirrorScale: .35, mirrorDensity: 320, mirrorFill: .7, mirrorRotation: .25, mirrorReaction: 1,
  crystalColumns: 180, crystalEdges: .2, crystalMotion: .5, crystalPulse: 1, crystalSaturation: 1, crystalMix: 1,
  rasterDensity: 400, rasterSize: .65, rasterScatter: .6, rasterRadial: .35, rasterWave: .1, rasterBackground: .1,
  inlayColumns: 160, inlayFill: .95, inlayDensity: .85, inlayGlow: .6, inlayReaction: 1, inlayBackground: .08,
  panelCount: 8, panelMagnify: .75, panelEdges: .65, panelLinks: .6, panelBackground: .55, panelReaction: 1,
  tileColumns: 48, tileObscure: .85, tileEdges: .7, tileFlash: .6, tileDirection: 0, tileReaction: 1,
  relicDensity: 240, relicSize: .55, relicLength: .7, relicShed: .95, relicBurst: 1, relicBody: .8,
  etchRows: 110, etchSwing: .75, etchWeight: .65, etchColor: .65, etchReaction: 1, etchBackground: .05,
  tunnelPanels: 8, tunnelDepth: .4, tunnelTwist: .55, tunnelGrid: .35, tunnelPhoto: .9, tunnelReaction: 1,
  cymDensity: 220, cymSize: .55, cymAttraction: .85, cymRotation: .2, cymBackground: .15, cymMode: 1,
  shardCells: 32, shardSpread: .7, shardTwist: .55, shardBurst: .8, shardEdges: .15, shardBackground: 0,
  morphDensity: 240, morphSize: .85, morphScatter: .45, morphStagger: .35, morphDuration: 1.2, morphThreshold: .04,
  ribbonCount: 48, ribbonStretch: .85, ribbonDrift: .3, ribbonMix: 1, ribbonReaction: 1, ribbonDirection: 2,
  echoCount: 6, echoDelay: .075, echoDecay: .78, echoSpread: .8, echoMix: .85, echoChroma: 1, echoReaction: 1,
  phaseSlices: .65, phaseBlocks: 1, phaseShift: 1, phaseChroma: .45, phaseNoise: .25, phaseReaction: 1,
  stippleSpacing: 7, stippleSize: .28, stippleDensity: 1.3, stippleReaction: 1, stippleScatter: .8, stippleBackground: .06, stipplePalette: 1,
  bendMode: 3, bendOffset: 257, bendMix: .95, bendBands: 32, bendReaction: 1,
  crtCurve: .6, crtLines: .65, crtGlow: .65, crtFringe: .5, crtNoise: .15, crtReaction: 1,
  topoLevels: 12, topoWidth: 1.2, topoContrast: .55, topoReaction: .8, topoScan: .4, topoBackground: .2, topoPalette: 2,
  stutterDuration: .32, stutterRepeats: 3, stutterPunch: .65, stutterShift: .45, stutterEcho: .35, stutterContrast: .3,
  hexSize: 24, hexFill: .82, hexEdges: .35, hexRelief: .5, hexReaction: .8, hexMix: 1,
  asciiSize: 24, asciiDensity: 1.25, asciiReaction: .85, asciiGlow: .35, asciiRain: .4, asciiPalette: 1,
  microSize: 10, microSpread: .6, microDensity: .75, microThreshold: .05, microBackground: .85, microMode: 0,
  traceDensity: 88, traceDepth: .65, traceWidth: 1.6, traceTilt: .55, traceHue: .49, traceMesh: 1,
  opticsDispersion: .7, opticsRefraction: .45, opticsFacets: 24, opticsLines: .3, opticsCoating: .6, opticsAngle: 45,
  voxelDensity: 84, voxelDepth: .65, voxelFill: .85, voxelTilt: .6, voxelGlow: .3,
  sortThreshold: .12, sortLength: .5, sortDirection: 1, sortReverse: 0, sortMix: 1,
  grainDensity: 55, grainDuration: .42, grainSize: .18, grainScatter: .55, grainRotation: .25, grainBackground: .55,
  ditherPitch: 4, ditherLevels: 4, ditherMix: 1, ditherReaction: .8, ditherPalette: 1, ditherScan: .3,
  glitchAttack: legacyPresets.fracture.glitchAttack, glitchRelease: legacyPresets.fracture.glitchRelease,
});

export function validateConfig(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Réglages invalides.');
  const result = { ...defaults };
  if(input.audioResponse!==undefined){if(!['legacy','adaptive-v1','balanced-v1'].includes(input.audioResponse))throw Error('Réactivité audio invalide.');result.audioResponse=input.audioResponse;}
  const bounds = { ...{"glowPhoto":[0,21],"glowBands":[10,160],"glowSpace":[0,0.9],"glowLight":[0,1],"glowStereo":[0,1],"glowLed":[0,1],"glowLumi":[0,1],"glowRadial":[0,1],"glowRotation":[0,270],"glowPeaks":[0,1],"glowPeakDrop":[0.9,0.999],"glowGradient":[0,6],"glowDirection":[0,1],"glowColorMode":[0,1],"glowFloor":[0,240],"glowSmoothing":[0,0.95],"glowGain":[0.25,3],"glowHeight":[0.1,1],"glowPosition":[0,1],"glowOpacity":[0,1]}, pegDensity: [80, 640], pegSize: [.2, 1], pegPalette: [0, 1], pegDither: [0, 1], pegThreshold: [0, 1], pegPop: [0, 1], pegReaction: [0, 1], moireColumns: [40, 640], moireAngle: [0, 1], moireDepth: [0, 1], moireChroma: [0, 1], moireReaction: [0, 1], moireMix: [0, 1], shearColumns: [40, 1920], shearStretch: [0, 1], shearTilt: [0, 1], shearChroma: [0, 1], shearLayout: [0, 1], shearReaction: [0, 1], chronoColumns: [40, 1920], chronoDelay: [0, 1.5], chronoShift: [0, 1], chronoTwist: [0, 1], chronoChroma: [0, 1], chronoReaction: [0, 1], vectorDensity: [80, 640], vectorLength: [0, 1], vectorWidth: [0, 1], vectorTurn: [0, 1], vectorBackground: [0, 1], vectorReaction: [0, 1], quadBase: [16, 128], quadLevels: [0, 4], quadDetail: [0, 1], quadEdges: [0, 1], quadReaction: [0, 1], quadMix: [0, 1], radarDensity: [64, 640], radarSize: [0, 1], radarSweep: [0, 1], radarTrail: [0, 1], radarBackground: [0, 1], radarReaction: [0, 1], specColumns: [40, 960], specFill: [0, 1], specTravel: [0, 1], specGlow: [0, 1], specBackground: [0, 1], specReaction: [0, 1], pressColumns: [40, 960], pressInk: [.4, 1.8], pressRegister: [0, 1], pressAngle: [0, 90], pressReaction: [0, 1], pressMix: [0, 1], circuitColumns: [40, 640], circuitWidth: [0, 1], circuitGlow: [0, 1], circuitTint: [0, 1], circuitBackground: [0, 1], circuitReaction: [0, 1], corruptProfile: [0, 2], corruptColumns: [40, 960], corruptCoverage: [0, 1], corruptChroma: [0, 1], corruptReaction: [0, 1], corruptMix: [0, 1], facetColumns: [80, 480], facetRotation: [0, 1], facetRelief: [0, 1], facetLighting: [0, 1], facetGap: [0, .6], facetBackground: [0, 1], facetReaction: [0, 1], binaryColumns: [40, 960], binaryLayers: [1, 8], binaryShift: [0, 1], binaryChroma: [0, 1], binaryReaction: [0, 1], binaryMix: [0, 1], plexDensity: [80, 480], plexSize: [.15, 1.4], plexLinks: [0, 1], plexSpread: [0, 1], plexReach: [.5, 3], plexBackground: [0, 1], codecCrush: [0, 1], codecColumns: [40, 960], codecShift: [0, 1], codecChroma: [0, 1], codecReaction: [0, 1], codecMix: [0, 1], weaveColumns: [40, 960], weaveFill: [0, 1], weaveTension: [0, 1], weaveTint: [0, 1], weaveMemory: [0, .84], weaveMix: [0, 1], feedbackMemory: [0, .84], feedbackShift: [0, 1], feedbackColumns: [40, 960], feedbackChroma: [0, 1], feedbackPhoto: [.2, 1], shockDensity: [100, 640], shockSize: [.15, 1.4], shockAmplitude: [0, 1], shockWidth: [0, 1], shockSpeed: [.25, 2.5], shockBackground: [0, 1], mirrorFolds: [3, 16], mirrorScale: [0, 1], mirrorDensity: [24, 640], mirrorFill: [.15, 1], mirrorRotation: [0, 1], mirrorReaction: [0, 1], crystalColumns: [12, 480], crystalEdges: [0, 1], crystalMotion: [0, 1], crystalPulse: [0, 1], crystalSaturation: [0, 2], crystalMix: [0, 1], rasterDensity: [100, 640], rasterSize: [.15, 1.4], rasterScatter: [0, 1], rasterRadial: [0, 1], rasterWave: [0, 1], rasterBackground: [0, 1], inlayColumns: [12, 480], inlayFill: [.2, 1], inlayDensity: [.1, 1], inlayGlow: [0, 1], inlayReaction: [0, 1], inlayBackground: [0, 1], panelCount: [1, 48], panelMagnify: [0, 1], panelEdges: [0, 1], panelLinks: [0, 1], panelBackground: [0, 1], panelReaction: [0, 1], tileColumns: [12, 480], tileObscure: [0, 1], tileEdges: [0, 1], tileFlash: [0, 1], tileDirection: [0, 2], tileReaction: [0, 1], relicDensity: [100, 360], relicSize: [.2, 1.4], relicLength: [0, 1], relicShed: [0, 1], relicBurst: [0, 1], relicBody: [0, 1], etchRows: [32, 200], etchSwing: [0, 1], etchWeight: [.2, 2], etchColor: [0, 1], etchReaction: [0, 1], etchBackground: [0, 1], tunnelPanels: [4, 12], tunnelDepth: [0, 1], tunnelTwist: [0, 1], tunnelGrid: [0, 1], tunnelPhoto: [0, 1], tunnelReaction: [0, 1], cymDensity: [100, 360], cymSize: [.2, 1.4], cymAttraction: [0, 1], cymRotation: [0, 1], cymBackground: [0, 1], cymMode: [0, 5], shardCells: [12, 64], shardSpread: [0, 1], shardTwist: [0, 1], shardBurst: [0, 1], shardEdges: [0, 1], shardBackground: [0, 1], morphDensity: [100, 360], morphSize: [.2, 1.4], morphScatter: [0, 1], morphStagger: [0, .8], morphDuration: [.2, 3], morphThreshold: [0, .4], ribbonCount: [8, 96], ribbonStretch: [0, 1], ribbonDrift: [0, 1], ribbonMix: [0, 1], ribbonReaction: [0, 1], ribbonDirection: [0, 2], echoCount: [2, 8], echoDelay: [.025, .18], echoDecay: [.2, .95], echoSpread: [0, 1], echoMix: [0, 1], echoChroma: [0, 1], echoReaction: [0, 1], phaseSlices: [0, 1], phaseBlocks: [0, 1], phaseShift: [0, 1], phaseChroma: [0, 1], phaseNoise: [0, 1], phaseReaction: [0, 1], stippleSpacing: [4, 24], stippleSize: [.12, .45], stippleDensity: [.5, 2], stippleReaction: [0, 1], stippleScatter: [0, 1], stippleBackground: [0, 1], stipplePalette: [0, 3], bendMode: [0, 3], bendOffset: [1, 500], bendMix: [0, 1], bendBands: [4, 120], bendReaction: [0, 1], crtCurve: [0, 1], crtLines: [0, 1], crtGlow: [0, 1], crtFringe: [0, 1], crtNoise: [0, 1], crtReaction: [0, 1], topoLevels: [3, 30], topoWidth: [.1, 4], topoContrast: [0, 1], topoReaction: [0, 1], topoScan: [0, 1], topoBackground: [0, 1], topoPalette: [0, 3], stutterDuration: [.12, .8], stutterRepeats: [1, 6], stutterPunch: [0, 1], stutterShift: [0, 1], stutterEcho: [0, 1], stutterContrast: [0, 1], hexSize: [8, 64], hexFill: [.2, 1], hexEdges: [0, 1], hexRelief: [0, 1], hexReaction: [0, 1], hexMix: [0, 1], asciiSize: [8, 48], asciiDensity: [.5, 2], asciiReaction: [0, 1], asciiGlow: [0, 1], asciiRain: [0, 1], asciiPalette: [0, 3], microSize: [4, 32], microSpread: [0, 1], microDensity: [0, 1], microThreshold: [0, .5], microBackground: [0, 1], microMode: [0, 2], traceDensity: [32, 160], traceDepth: [0, 1], traceWidth: [.5, 4], traceTilt: [0, 1], traceHue: [0, 1], traceMesh: [0, 1], opticsDispersion: [0, 1], opticsRefraction: [0, 1], opticsFacets: [8, 64], opticsLines: [0, 1], opticsCoating: [0, 1], opticsAngle: [0, 180], voxelDensity: [32, 140], voxelDepth: [0, 1], voxelFill: [.3, 1], voxelTilt: [0, 1], voxelGlow: [0, 1], sortThreshold: [0, .9], sortLength: [.03, 1], sortDirection: [0, 1], sortReverse: [0, 1], sortMix: [0, 1], grainDensity: [10, 100], grainDuration: [.08, 1.2], grainSize: [.05, .4], grainScatter: [0, 1], grainRotation: [0, 1], grainBackground: [0, 1], ditherPitch: [2, 12], ditherLevels: [2, 8], ditherMix: [0, 1], ditherReaction: [0, 1], ditherPalette: [0, 2], ditherScan: [0, 1], reliefDensity: [100, 300], reliefDepth: [0, 1], reliefSize: [.2, 1.4], reliefOrbit: [0, 1], intensity: [0, 1], zoom: [0, 1], distortion: [0, 1], rgb: [0, 1], kaleidoscope: [0, 12], speed: [0, 1], imageSeconds: [0.04, 120], sensitivity: [0.25, 3], ledSpacing: [8, 48], ledFill: [0, 1], ledGlow: [0, 1], edgeThickness: [.5, 5], neonHue: [0, 1], edgeBrightness: [0, 1], glitchBands: [8, 72], glitchShift: [0, 1], glitchBlocks: [0, 1], glitchGrain: [0, 1], glitchAttack: [.25, 3], glitchRelease: [.06, .5] };
  Object.assign(bounds, { orbitAmplitude:[0,20], orbitKick:[0,10], orbitMode:[0,1], orbitCenterX:[.2,.8], orbitCenterY:[.2,.8], orbitGrain:[0,1], orbitReturn:[.16,.8], orbitReaction:[0,1], dataDensity:[160,800], dataSize:[.2,1.5], dataFlow:[0,1], dataDepth:[0,1], dataTrail:[0,1], dataTint:[0,1], dataBackground:[0,1], dataReturn:[.08,.5], dataReaction:[0,1], lamColumns:[40,640], lamTravel:[0,1], lamFold:[0,1], lamLight:[0,1], lamGrain:[0,1], lamAngle:[-90,90], lamReturn:[.08,.4], lamGain:[.5,4], lamReaction:[0,1], advPitch:[1,10], advFlow:[0,1], advDepth:[0,1], advTrail:[0,1], advGrain:[0,1], advChroma:[0,1], advReturn:[.06,.32], advGain:[.5,4], advReaction:[0,1], portalFrames:[4,40], portalDepth:[0,1], portalTwist:[0,1], portalTilt:[0,1], portalGlow:[0,1], portalBackground:[0,1], portalReturn:[.06,.32], portalGain:[.5,4], portalThreshold:[.1,1.5], portalReaction:[0,1], wfRows:[48,256], wfFill:[.1,1], wfDepth:[0,1], wfRipple:[0,1], wfAngle:[0,1], wfHistory:[.1,3], wfGlow:[0,1], wfTint:[0,1], wfBackground:[0,1], wfReaction:[0,1], kinColumns:[12,144], kinDepth:[0,1], kinSpread:[0,1], kinSpin:[0,1], kinFlow:[0,1], kinGlow:[0,1], kinBackground:[0,1], kinReaction:[0,1], holoLayers:[4,48], holoDepth:[0,1], holoOrbit:[0,1], holoPhoto:[0,1], holoLines:[0,1], holoTint:[0,1], holoScan:[0,1], holoReaction:[0,1], sculptDepth:[0,1], sculptOrbit:[0,1], sculptSmooth:[0,1], sculptLight:[0,1], sculptFacets:[0,1], sculptWave:[0,1], sculptReaction:[0,1], sculptDensity:[40,320], glowPhoto:[0,photoModelIds.length] });
  for (const [key, [min, max]] of Object.entries(bounds)) {
    if (input[key] === undefined) continue;
    if (typeof input[key] !== 'number' || !Number.isFinite(input[key]) || input[key] < min || input[key] > max) throw new Error(`Réglage invalide : ${key}.`);
    result[key] = input[key];
  }
  for (const key of ['orbitMode', 'dataDensity', 'lamColumns', 'portalFrames', 'wfRows', 'kinColumns', 'holoLayers', 'sculptDensity', 'glowPhoto', 'glowBands', 'glowStereo', 'glowLed', 'glowLumi', 'glowRadial', 'glowRotation', 'glowPeaks', 'glowGradient', 'glowDirection', 'glowColorMode', 'glowFloor', 'pegDensity', 'moireColumns', 'shearColumns', 'shearLayout', 'chronoColumns', 'vectorDensity', 'quadBase', 'quadLevels', 'radarDensity', 'specColumns', 'pressColumns', 'circuitColumns', 'corruptProfile', 'corruptColumns', 'facetColumns', 'binaryColumns', 'binaryLayers', 'plexDensity', 'codecColumns', 'weaveColumns', 'feedbackColumns', 'shockDensity', 'mirrorFolds', 'mirrorDensity', 'crystalColumns', 'rasterDensity', 'inlayColumns', 'panelCount', 'tileColumns', 'tileDirection', 'relicDensity', 'etchRows', 'tunnelPanels', 'cymDensity', 'cymMode', 'shardCells', 'morphDensity', 'ribbonCount', 'ribbonDirection', 'echoCount', 'stippleSpacing', 'stipplePalette', 'bendMode', 'bendOffset', 'bendBands', 'topoLevels', 'topoPalette', 'ditherLevels', 'ditherPalette', 'grainDensity', 'sortDirection', 'sortReverse', 'voxelDensity', 'opticsFacets', 'traceDensity', 'traceMesh', 'microSize', 'microMode', 'asciiSize', 'asciiPalette', 'hexSize', 'stutterRepeats']) if (!Number.isInteger(result[key])) throw new Error(`Réglage entier requis : ${key}.`);
  if (![10,20,40,80,160].includes(result.glowBands) || ![0,90,180,270].includes(result.glowRotation)) throw new Error('Disposition du spectre invalide.');
  if (input.engine !== undefined && input.engine !== 'astrofox') throw new Error('Ce moteur n’est pas encore intégré.');
  if (input.preset !== undefined) {
    if (!['orbit', 'dataGrains', 'lamella', 'advection', 'portal', 'wavefield', 'kinetic', 'holo', 'sculpt', 'stereoGlow', 'pegboard', 'moire', 'shear', 'chrono', 'vector', 'quadtree', 'radar', 'spectrum', 'press', 'circuit', 'corruption', 'facets', 'binary', 'plexus', 'codec', 'weave', 'feedback', 'shock', 'mirrorgrain', 'crystal', 'raster', 'intarsia', 'fenestra', 'tessera', 'reliquary', 'etch', 'tunnel', 'cymatics', 'shards', 'morph', 'ribbons', 'echo', 'phase', 'stipple', 'databend', 'crt', 'topography', 'pulse', 'led', 'relief', 'dither', 'granular', 'pixelsort', 'voxel', 'interference', 'trace', 'micro', 'ascii', 'hex', 'stutter', 'fracture', 'neon', 'prism', 'spectral'].includes(input.preset)) throw new Error('Modèle inconnu.');
    result.preset = input.preset;
  }
  if (input.fit !== undefined) {
    if (!['cover', 'contain'].includes(input.fit)) throw new Error('Cadrage invalide.');
    result.fit = input.fit;
  }
  if (input.fps !== undefined) {
    if (![30, 60].includes(input.fps)) throw new Error('Cadence invalide.');
    result.fps = input.fps;
  }
  return result;
}
