# Ressources tierces

## WebSocket de production

`ws` et son accélérateur facultatif `bufferutil`, par Einar Otto Stangvik, Arnout Kazemier, Luigi Pinca et contributeurs, sont sous licence MIT. Sources : https://github.com/websockets/ws et https://github.com/websockets/bufferutil. Versions figées dans package-lock.json ; textes complets conservés dans node_modules/ws/LICENSE et node_modules/bufferutil/LICENSE. Le serveur de transfert, le protocole d’acquittement, le compactage RGB et le traitement des longues analyses sont propres à MusicFrame Render.

## Astrofox

Copyright (c) 2020 Mike Cao <mike@mikecao.com> — MIT.

Source : https://github.com/astrofox-io/astrofox

Révision : `ef3312505eb2830f34440da0196fa1ec545be659`.

Fichiers copiés dans `public/vendor/astrofox` : `distortion.glsl`, `kaleidoscope.glsl`, `rgb-shift.glsl`, `led.glsl`, `edge-detection.glsl` et `classic-noise-3d.glsl`. Les sources sont conservées sans modification ; la résolution de l'inclusion GLSL se fait au chargement dans `public/engine.js`. Composition, cadrage et mapping audio propres à MusicFrame Render. Les modèles Matrice LED et Contours néon utilisent `src/lib/shaders/glsl/fragment/led.glsl` et `src/lib/shaders/glsl/fragment/edge-detection.glsl` de cette même révision MIT.

Le texte complet de la licence est conservé dans `public/vendor/astrofox/LICENSE`.

Fracture numérique ajoute notre propre shader de découpe de photos (`public/shaders/fracture.glsl`) au compositeur, avec la séparation RGB déjà adaptée d'Astrofox. Ce modèle ne copie pas le shader Glitch d'Astrofox ou celui de unityglitch. Le shader Edge Detection reste disponible pour lire les anciens projets ; le modèle Contours néon a été retiré du catalogue après refus de l'utilisateur.

## WebGL Noise

Les fonctions de bruit utilisées dans le shader de distorsion viennent de Stefan Gustavson, Ian McEwan et Ashima Arts, sous MIT. Voir les commentaires du code et `public/vendor/astrofox/WEBGL-NOISE-LICENSE`.

## Dépendances npm

Express, Multer, yauzl, Sharp, FFT.js, Three.js et Playwright gardent leurs licences dans leurs paquets installés. Versions exactes figées par `package-lock.json`. Les composants natifs et transitifs, notamment libvips pour Sharp, ont leurs propres licences incluses dans leur distribution. Aucun code tiers n'est déclaré comme notre propriété.

FFmpeg et FFprobe sont appelés comme programmes externes présents sur la machine ; aucun binaire FFmpeg n'est redistribué dans ce dépôt. Chromium installé par Playwright est une dépendance du rendu serveur avec ses propres mentions.

## Memory Signal

Copyright (c) 2025 shuhari04 — MIT. Source : https://github.com/shuhari04/memory-signal-threejs

`public/relief.js` adapte l’échantillonnage des pixels, les couleurs des points, le relief par luminosité et les grains circulaires du fichier `main.js` du projet Memory Signal cité ci-dessus. Licence complète conservée dans `public/vendor/memory-signal/LICENSE`. Le mapping MP3, le cadrage, la rotation et les paramètres sont propres à MusicFrame Render. Pas de bruit curl ni de bloom du projet original. Le relief par luminosité ne reconstruit pas la géométrie réelle de la photo.


## Ditherer — Trame numérique

Copyright 2026 Ng Guoyou, contributors — MIT.
Source : https://github.com/gyng/ditherer
Révision : `f9608872658d53f4916a5eef4d3312019285a8f0`.

Le modèle Trame numérique adapte le biais de seuil, l’arrondi demi-supérieur et la quantification sRGB de `packages/ditherer-filters/src/filters/orderedGL.ts`, ainsi que la matrice Bayer 4×4 de `ordered.ts`. Les deux fichiers sources d’origine sont conservés avec la licence complète dans `public/vendor/ditherer/`. Adaptation Three.js dans `public/shaders/dither.glsl` et `public/engine.js`. Palettes cyan/ambre, lignes d’écran, composition et mapping du MP3 développés pour MusicFrame Render. Il s’agit d’un filtre ciblé ; l’éditeur Ditherer et ses autres filtres ne sont pas intégrés. Aucune nouvelle dépendance exécutable tierce.

## Granulator — Fragments granulaires

Copyright (c) 2026 willbearfruits — MIT.
Source : https://github.com/willbearfruits/videoglitchcrazynes
Révision : `f28bbdc87064886d7af6d8d6bf46264e3f041b01`.

Le modèle Fragments granulaires est un portage ciblé des principes et du code `glitchcore/granular.py` : départs stratifiés, durée variable, recadrage spatial, échelle, rotation et enveloppe de Hann pour le mélange normal. Source originale et licence complète dans `public/vendor/granulator/`. Port JavaScript/Three.js dans `public/grain-schedule.js` et `public/granular.js` : générateur aléatoire par index pour permettre les sauts dans le morceau sans historique, rendu GPU instancié et modulation audio propres au studio. Le modèle échantillonne la photo courante, sans reprendre le balayage de vidéo, le granulateur audio ni l’éditeur Python complet. Le MP3 reste la bande sonore stéréo. Aucun paquet Python/OpenCV supplémentaire n’est installé.

## Ditherer — Tri spectral

`public/pixel-sort.js` adapte le parcours ligne/colonne, les intervalles limités et filtrés par luminosité et le tri par luminance de `packages/ditherer-filters/src/filters/pixelsort.ts`, révision `f9608872658d53f4916a5eef4d3312019285a8f0` de gyng/ditherer. Copyright 2026 Ng Guoyou, contributors — MIT. Source originale conservée dans `public/vendor/ditherer/pixelsort.ts`, licence dans ce même dossier. La cache de textures et la révélation par bandes modulée au MP3 sont propres au studio. Ce modèle conserve les valeurs RGBA à l’intérieur des segments triés ; il n’intègre pas les autres parcours ou palettes du filtre original.

## Mosaïque voxel — variante du traitement photo Memory Signal

`public/voxel.js` reprend l’échantillonnage des couleurs de photo et le calcul du relief par luminosité déjà adaptés de Memory Signal (Copyright 2025 shuhari04, MIT, licence dans `public/vendor/memory-signal/LICENSE`). Le rendu par cubes instanciés, le tampon avec profondeur, l’éclairage, les arêtes et le mapping audio sont développés pour MusicFrame Render avec Three.js. Cette variante n’existe pas telle quelle dans le projet original. Le relief dépend de la luminosité et ne reconstruit pas la géométrie réelle de la scène photographiée. Aucune dépendance ajoutée.

## Interférences chromatiques

`public/shaders/interference.glsl` adapte l’échantillonnage séparé des canaux RGB du shader Astrofox `rgb-shift.glsl`, déjà conservé sous MIT avec son copyright 2020 Mike Cao dans `public/vendor/astrofox/`. Facettes optiques, réfraction, coloration spectrale, trames croisées et mapping du MP3 développés pour MusicFrame Render. Ce modèle ne correspond pas à une fonction complète existante d’Astrofox ; il compose cette adaptation avec notre code. Aucune nouvelle dépendance ni ressource externe.

## Tracé vectoriel — variante filaire du traitement photo

`public/trace.js` adapte le relief photo par luminance de Memory Signal (Copyright 2025 shuhari04, MIT, licence conservée dans `public/vendor/memory-signal/LICENSE`). Surface continue triangulée, shader de lignes avec anticrénelage par dérivées, balayage lumineux et mapping audio développés pour MusicFrame Render avec Three.js. Le modèle propose maillage complet ou lignes horizontales. Ce rendu filaire n’est pas une fonction existante de Memory Signal ; le relief ne reconstruit pas la géométrie photographiée. Le nom décrit l’esthétique : l’export reste une vidéo raster 1080p.

## Ditherer — Micro-mosaïque

Adaptation ciblée de `packages/ditherer-filters/src/filters/pixelScatter.ts`, gyng/ditherer, révision `f9608872658d53f4916a5eef4d3312019285a8f0`. Copyright 2026 Ng Guoyou, contributors — MIT. Source originale conservée dans `public/vendor/ditherer/pixelScatter.ts` et licence dans ce dossier.

Le rendu `public/micro-mosaic.js` reprend la sélection par force des détails, la fraction de pixels dispersés et la direction sortante du gradient. L’estimation des détails utilise des différences centrales entre échantillons, au lieu du Sobel CPU d’origine. Les pixels individuels deviennent de petits rectangles texturés instanciés sur GPU ; la géométrie, les mouvements radial/horizontal, la graine par cellule et la modulation MP3 sont propres au studio. Ce portage ne prétend pas reproduire l’ordre des écritures last-write-wins du filtre CPU. Aucun nouveau paquet installé.

## Ditherer — Écran matriciel

Adaptation de `packages/ditherer-filters/src/filters/ascii.ts`, gyng/ditherer, révision `f9608872658d53f4916a5eef4d3312019285a8f0`. Copyright 2026 Ng Guoyou, contributors — MIT. Source originale conservée dans `public/vendor/ditherer/ascii.ts`, licence dans ce dossier.

Le shader `public/shaders/ascii.glsl` reprend la rampe de caractères tonaux et la transformation de luminance selon la densité du filtre ASCII. L’échantillonnage par cellule utilise quatre points de la photo composée plutôt que la moyenne exhaustive CPU. Atlas bitmap 5×7 dessiné pour MusicFrame Render dans `public/ascii-atlas.js`, rendu GPU, halo, balayage et modulation audio propres au studio. Aucun fichier de police externe ni nouvelle dépendance. L’atlas fixe évite les différences de fontes entre les navigateurs LAN et le rendu serveur.

## Ditherer — Trame hexagonale

`public/shaders/hex.glsl` adapte les conversions grille hexagonale/coordonnées axiales, l’arrondi cubique et l’échantillonnage au centre de `packages/ditherer-filters/src/filters/hexPixelate.ts`, gyng/ditherer, révision `f9608872658d53f4916a5eef4d3312019285a8f0`. Copyright 2026 Ng Guoyou, contributors — MIT. Source originale et licence conservées dans `public/vendor/ditherer/`.

Ouverture des alvéoles, anticrénelage par dérivées, éclairage des facettes, bordures et modulation du MP3 propres à MusicFrame Render. Cette adaptation n’intègre pas les palettes ni toute la bibliothèque Ditherer. Aucun nouveau paquet installé.

## Stutter numérique

Création MusicFrame Render : `public/audio-stutter.js` calcule des rafales de reprises de cadrage depuis les attaques du MP3, et `public/shaders/stutter.glsl` réalise zoom, déplacement, contraste et rémanence de la photo. Séparation RGB composée avec le shader Astrofox déjà intégré sous MIT, Copyright 2020 Mike Cao, licence et source dans `public/vendor/astrofox/`. Aucune nouvelle dépendance ni portage annoncé d’un filtre vidéo tiers. Ce modèle rejoue des transformations de cadrage d’une photo ; il ne granule pas le MP3 et ne fige pas un flux vidéo.

## Ditherer — Topographie numérique

`public/shaders/topography.glsl` adapte le shader de `packages/ditherer-filters/src/filters/contourLinesGL.ts`, gyng/ditherer, révision `f9608872658d53f4916a5eef4d3312019285a8f0`. Copyright 2026 Ng Guoyou, contributors — MIT. Source originale et licence conservées dans `public/vendor/ditherer/`.

Quantification de luminance, conservation bornée de la chrominance et courbes de niveau anticrénelées par dérivées repris de cette source. Contraste, déplacement des seuils par le MP3, épaisseur modulée, palettes et mélange avec la photo propres au studio. Traitement 2D ; aucune reconstruction de géométrie. Aucune nouvelle dépendance.

## Ditherer — Tube cathodique

`public/shaders/crt.glsl` adapte `packages/ditherer-filters/src/filters/vintageTVGL.ts`, gyng/ditherer, révision `f9608872658d53f4916a5eef4d3312019285a8f0`. Copyright 2026 Ng Guoyou, contributors — MIT. Source originale et licence conservées dans `public/vendor/ditherer/`.

Conversions RGB/YIQ et sRGB/linéaire, moyenne pondérée de chrominance, bruit déterministe et formule gaussienne du faisceau repris de la source. Adaptation en une passe : rayon de chrominance fixé à deux échantillons de chaque côté, lueur en croix au lieu du flou séparable original. Courbure, bords du tube et modulation depuis les bandes audio propres au studio ; pas de simulation complète du décodeur analogique. Aucune nouvelle dépendance.

## Ditherer — Databending

`public/byte-bend.js` porte les quatre transformations du flux d’octets RGBA de `packages/ditherer-filters/src/filters/dataBend.ts`, gyng/ditherer, révision `f9608872658d53f4916a5eef4d3312019285a8f0`. Copyright 2026 Ng Guoyou, contributors — MIT. Source originale et licence conservées dans `public/vendor/ditherer/`. Écho bipolaire, réverbération, quantification/décimation et inversion de blocs, avec restauration de l’alpha. Pas de quantification de palette supplémentaire.

Le cache photo dans `public/bent-photo.js`, le mélange par bandes et le mapping audio du shader de composition sont propres au studio. Transformation des octets calculée à intensité fixe de 80 %, puis révélation visuelle modulée par la musique ; les données du MP3 restent intactes. Aucune nouvelle dépendance.

## Ditherer — Pointillisme granulaire

`public/shaders/stipple.glsl` adapte `packages/ditherer-filters/src/filters/stippleGL.ts` et la couverture anticrénelée de `printmakingToneContracts.ts`, gyng/ditherer, révision `f9608872658d53f4916a5eef4d3312019285a8f0`. Copyright 2026 Ng Guoyou, contributors — MIT. Sources originales et licence conservées dans `public/vendor/ditherer/`.

Seuil de densité pseudo-aléatoire, placement irrégulier et couverture des points de rayon constant repris de ces sources. Adaptation lumineuse : luminosité à la place de l’obscurité, couleurs de photo ou palettes, densité tonale réglable, réaction audio, déplacement borné dans la cellule et grille virtuelle 1080p. Rayon limité à 45 % de l’espacement, recherche limitée aux neuf cellules voisines ; pas de relaxation de Voronoï ni reconstruction 3D. Aucune nouvelle dépendance.

## phase-viz — Signal industriel

`public/phase-image.js` porte des fonctions ciblées de `src/ui/ImageFXVisualizer.tsx` (drawDistortedStrips, drawBlockDatamosh, drawToggleRgbSplit, drawToggleGlitchNoise et seededNoise), 7g3n/phase-viz, révision `6f50cdd9054861459af1ca9228a9df0d119d4c9e`. Copyright 2026 Nagisa Dozono — MIT. Sources originales, préréglages Image FX et licence conservés dans `public/vendor/phase-viz/`.

Rendu Canvas 2D placé dans une texture Three.js, réglages locaux, fit cover/contain et mise à l’échelle selon le format de sortie propres au studio. Le temps du MP3 remplace le temps navigateur ; les enveloppes basse/médium/aigu et attaques remplacent le spectre 128 points. Les amplitudes et mélanges sont adaptés et la réaction peut revenir à zéro. Pas de feedback entre images ni de datamoshing sur flux vidéo compressé. Le reste de l’application React et les encodeurs tiers ne sont pas embarqués ; aucune nouvelle dépendance.

## phase-viz — Écho cinétique

`public/phase-echo.js` adapte les oscillateurs de `drawCameraShake`, les décalages sinusoïdaux et la composition écran de `drawDatamoshFeedback` dans `src/ui/ImageFXVisualizer.tsx`, 7g3n/phase-viz, révision `6f50cdd9054861459af1ca9228a9df0d119d4c9e`. Copyright 2026 Nagisa Dozono — MIT. Source originale et licence conservées dans `public/vendor/phase-viz/`.

L’historique fini de poses photographiques recalculées depuis le MP3, sa normalisation, ses filtres colorés, ses contrôles et sa remise à zéro au changement d’image sont propres au studio. Il remplace le feedback récursif original. Aucun historique vidéo complet ni copie d’une image provenant d’un autre fichier ne sont conservés. Aucune nouvelle dépendance.

## phase-viz — Rubans numériques

`public/phase-ribbons.js` adapte le découpage et l’étirement par colonnes de `drawMeltDatamosh` dans `src/ui/ImageFXVisualizer.tsx`, 7g3n/phase-viz, révision `6f50cdd9054861459af1ca9228a9df0d119d4c9e`. Copyright 2026 Nagisa Dozono — MIT. Source originale et licence conservées dans `public/vendor/phase-viz/`.

Nombre de colonnes réglable, enveloppes musicales locales, interpolation basse/médium/aigu, amplitude adaptée, alternance haut/bas et temps quantifié au MP3 propres au studio. Le canvas est recomposé depuis la photo à chaque rendu ; pas de feedback accumulé ou de corruption d’un flux compressé. Aucune nouvelle dépendance.

## Fosfora — Morphose granulaire

`public/photo-morph.js` adapte les cibles de particules, le mode Direct, le décalage temporel, l’interpolation cubique, la dispersion et la pulsation de taille de `assets/shaders/morph_sim.wgsl`, ainsi que le principe de grille décalée de `crates/fosfora-app/src/gpu/particle/image_source.rs`. Dépôt kevinraymond/fosfora, révision `8732bf30898c6fd693061e6053860161b2f60181`. Copyright 2025–2026 Kevin Raymond. Licence MIT choisie parmi les deux licences proposées ; texte et sources conservés dans `public/vendor/fosfora/`.

Adaptation GLSL/Three.js : échantillonnage Canvas de chaque photo cadrée à la densité choisie, seuil de luminosité, hash 32 bits local au lieu du LCG 64 bits, appariement par ordre de parcours et dispersion analytique depuis les enveloppes/attaques du MP3. Le calendrier `public/morph-timing.js` remplace l’état temporel de la simulation. Pas de solveur de ressort, de curl noise, de MFCC, de mélange 3D ou de simulation native Fosfora embarqué. Aucune nouvelle dépendance ; aucune fonction Ableton Link incluse.

## Fosfora — Éclats polygonaux

`public/voronoi-shards.js` et `public/photo-shards.js` adaptent les graines de Voronoï, directions de translation, rotation et multiplicateurs de déplacement du mode Shards dans `assets/shaders/raster_sim.wgsl`, ainsi que le hash de `assets/shaders/lib/particle_lib.wgsl`. kevinraymond/fosfora, révision `8732bf30898c6fd693061e6053860161b2f60181`. Copyright 2025–2026 Kevin Raymond, MIT. Sources originales, définition et licence conservées dans `public/vendor/fosfora/`.

Le découpage par demi-plans et la triangulation permettent de rendre des facettes pleines avec la texture de la photo, au lieu des particules du Raster original. Transformation directe des facettes au temps du MP3, arêtes, cadrage et photo de fond propres au studio. Pas de solveur de ressort, de dynamique entre images, de particules effilochées ou de rendu 3D du moteur natif. Aucune nouvelle dépendance, aucun module Ableton Link.

## Fosfora — Cymatique photo

`public/photo-cymatics.js` reprend la fonction de Chladni, son gradient analytique, la rotation, le mélange de champs entre modes et la formule de taille sur les lignes nodales de `assets/shaders/cymatics_sim.wgsl`. kevinraymond/fosfora, révision `8732bf30898c6fd693061e6053860161b2f60181`. Copyright 2025–2026 Kevin Raymond — MIT. Source, définition et licence conservées dans `public/vendor/fosfora/`.

Adaptation photo par texture, grille de points, modes distincts sélectionnés et projection bornée de six étapes propres au studio. Les enveloppes basse/médium/aigu remplacent les contrôles MFCC/chroma de la source. Pas de simulation de vitesses, de diffusion accumulée, de lifecycle natif, de feedback ou de détection de tonalité. Aucune nouvelle dépendance, aucun module Ableton Link.

## Fosfora — Tunnel photographique

`public/shaders/tunnel.glsl` adapte les coordonnées polaires, la profondeur logarithmique, les panneaux/anneaux, le damier et l’ombrage de profondeur de `assets/shaders/tunnel.wgsl`. kevinraymond/fosfora, révision `8732bf30898c6fd693061e6053860161b2f60181`. Copyright 2025–2026 Kevin Raymond — MIT. Shader original, définition et licence conservés dans `public/vendor/fosfora/`.

Les panneaux photographiques, les couleurs de lignes, le mapping au MP3 et l’intégrale d’enveloppe `public/audio-integral.js` sont propres au studio. Le bruit FBM, les palettes natives, le passe de phase accumulée et le masque en amande du moteur original ne sont pas intégrés. Aucune nouvelle dépendance et aucun module Ableton Link.

## Fosfora — Oscillographe photo

`public/shaders/etch.glsl` adapte la réduction en lignes horizontales, l’amplitude liée au ton, la porteuse triangulaire proportionnelle au nombre de lignes et l’épaisseur de `assets/shaders/etch_sim.wgsl`. kevinraymond/fosfora, révision `8732bf30898c6fd693061e6053860161b2f60181`. Copyright 2025–2026 Kevin Raymond — MIT. Source originale et licence conservées dans `public/vendor/fosfora/`.

Adaptation fragment GLSL : cinq lignes voisines, teinte photo/cyan, fond réglable, amplitude basse/médium et vibration des attaques MP3. Défilement par intégrale d’enveloppe et temps musical. Aucun état accumulé, particule native, poudre graphite, effacement progressif ou simulation Etch complète ; le dessin entier est recalculé à chaque image. Aucune nouvelle dépendance et aucun module Ableton Link.

## Fosfora — Éjection granulaire

`public/photo-reliquary.js` adapte le partage corps/lumière émise, le seuil `1 - shed * 0.4`, le déplacement radial, le fondu sinusoïdal, le gain des grains et la dilatation sur les basses de `assets/shaders/reliquary_sim.wgsl`. kevinraymond/fosfora, révision `8732bf30898c6fd693061e6053860161b2f60181`. Copyright 2025–2026 Kevin Raymond — MIT. Source et licence conservées dans `public/vendor/fosfora/`.

Adaptation Three.js de points 2D échantillonnant les photos. Le corps reste présent sous les grains émis au lieu de retirer les échantillons lumineux de la population du corps. Le ressort et l’état de simulation natif sont remplacés par une position directe et une phase analytique, intégrée depuis l’enveloppe RMS du MP3. Attaques vers distance de projection, basses vers dilatation/distance et aigus vers brillance. Pas de modèle 3D, rayons volumétriques, feedback ou collision natifs. Aucune nouvelle dépendance ni Ableton Link.

## Fosfora — Décodage numérique

`public/shaders/tessera.glsl` adapte les ordres de révélation dispersé/vertical/radial, l’accent au front et les grilles fine/grossière de `assets/shaders/tessera.wgsl`. kevinraymond/fosfora, révision `8732bf30898c6fd693061e6053860161b2f60181`. Copyright 2025–2026 Kevin Raymond — MIT. Source originale et licence conservées dans `public/vendor/fosfora/`.

Composition photo opaque propre au studio : les enveloppes basse/médium/aigu et attaques du MP3 ouvrent les cellules ; aucun cycle autonome ni horloge de mesure musicale native. Hash GLSL local, bords anti-crénelés, contraste, cyan/ambre et mapping audio propres au studio. Les palettes tonales, détection de drop/buildup et le système de couches complet de Fosfora ne sont pas embarqués. Aucune dépendance ajoutée ni module Ableton Link.

## Fosfora — Fenêtres de signal

`public/shaders/fenestra.glsl` adapte le placement, dimensions, cadres, coins, en-têtes et connexions de `assets/shaders/fenestra.wgsl`. kevinraymond/fosfora, révision `8732bf30898c6fd693061e6053860161b2f60181`. Copyright 2025–2026 Kevin Raymond — MIT. Source originale et licence conservées dans `public/vendor/fosfora/`.

Adaptation photo propre au studio : détails agrandis à l’intérieur des panneaux, fond photo et composite opaque ; ouverture, contraction et éclairage depuis les enveloppes basse/médium et attaques du MP3. Hash et géométrie GLSL locaux, 48 panneaux maximum. Pas de reconnaissance d’objets, analyse d’image sémantique, cycle de mesures, buildup/drop, palettes tonales ni système de couches natif. Aucun état accumulé, aucune dépendance ajoutée ni Ableton Link.

## Fosfora — Mosaïque active

`public/shaders/intarsia.glsl` adapte les couleurs par cellule, les enveloppes périodiques décalées, les tuiles en retrait et la brillance à l’arrivée de `assets/shaders/intarsia.wgsl`. kevinraymond/fosfora, révision `8732bf30898c6fd693061e6053860161b2f60181`. Copyright 2025–2026 Kevin Raymond — MIT. Source originale et licence conservées dans `public/vendor/fosfora/`.

Le studio moyenne quatre échantillons photo par tuile, compose un fond réglable et remplace l’horloge de mesures native par une phase analytique issue du temps MP3 et de l’intégrale RMS. Basses/attaques modulent présence et taille, aigus/attaques la brillance. Hash GLSL local et anti-crénelage selon la résolution. Pas de passe d’analyse de backdrop native, BPM, détection de drop ou moteur complet Fosfora. Aucune nouvelle dépendance, aucun module Ableton Link.

## Fosfora — Nuage numérique

`public/photo-raster.js` adapte la dispersion radiale, les vagues médium, la dispersion par grain sur les attaques, la direction d’impulsion et la taille liée à la luminance de `assets/shaders/raster_sim.wgsl`. kevinraymond/fosfora, révision `8732bf30898c6fd693061e6053860161b2f60181`. Copyright 2025–2026 Kevin Raymond — MIT. Source et licence déjà conservées dans `public/vendor/fosfora/`.

Grille Three.js de 100–640 colonnes, échantillonnage photo par texture, fond photo réglable et hash entier local. Le déplacement est calculé directement depuis les bandes MP3 et une enveloppe d’attaque de 180 ms. Le ressort, les collisions, les vitesses accumulées et le scintillement par gradient natifs sont remplacés ; rayon atténué au centre pour éviter un trou. Pas de tessellation Voronoï, swirl, feedback ou moteur natif complet dans ce modèle. Aucune nouvelle dépendance ni Ableton Link.

## Fosfora — Mosaïque cristalline

`public/shaders/crystal.glsl` adapte la recherche Voronoï 3 × 3, le mouvement des graines, leur déplacement sur les attaques, les contours et la saturation de `assets/shaders/shards.wgsl`. kevinraymond/fosfora, révision `8732bf30898c6fd693061e6053860161b2f60181`. Copyright 2025–2026 Kevin Raymond — MIT. Source originale et licence conservées dans `public/vendor/fosfora/`.

Couleur de chaque cellule échantillonnée dans la photo au centre de sa graine, au lieu des palettes procédurales natives. Finesse 12–480, contours anti-crénelés par dérivées, mélange photo et phase issue du temps MP3/intégrale RMS propres au studio. Les bandes et attaques remplacent les métriques beat/kick/centroid natives. Aucun maillage, simulation de particules, reconnaissance d’image ou reconstruction 3D. Aucune nouvelle dépendance ni Ableton Link.

## Fosfora — Prisme granulaire

`public/shaders/mirror-grain.glsl` adapte le repliement angulaire en miroir, la rotation et la dilatation sur les basses de `assets/shaders/prism.wgsl`. kevinraymond/fosfora, révision `8732bf30898c6fd693061e6053860161b2f60181`. Copyright 2025–2026 Kevin Raymond — MIT. Source originale et licence conservées dans `public/vendor/fosfora/`.

Le studio remplace le bruit FBM et les palettes procédurales par la photo, échantillonnée en grains ronds. Répétition miroir, anti-crénelage par dérivées, 3–16 symétries, finesse 24–640, mélange d’intensité et phase analytique temps MP3/intégrale RMS propres au studio. Aucun FBM, overlay hexagonal, palette tonale ou détecteur de beat natif embarqué. Aucune nouvelle dépendance ni Ableton Link.

## Fosfora — Ondes d’impact

`public/photo-shock.js` et `public/audio-shock.js` adaptent les anneaux gaussiens, leur expansion radiale et leur fondu quadratique de `assets/shaders/pulse.wgsl`. kevinraymond/fosfora, révision `8732bf30898c6fd693061e6053860161b2f60181`. Copyright 2025–2026 Kevin Raymond — MIT. Source et licence conservées dans `public/vendor/fosfora/`.

Le studio transforme les anneaux en déplacement de grains photographiques et déclenche les huit ondes les plus récentes depuis les attaques du MP3. Échantillonnage sans historique de rendu, durée 1,7 / vitesse, rayon âge × vitesse × 0,8, pression plafonnée. Texture photo, cadrage et taille/fond réglables. Pas de phase BPM, palette procédurale ou feedback natifs. Aucune nouvelle dépendance ni Ableton Link.

## Butterchurn — Mémoire vidéo

Bibliothèque complète Butterchurn 2.6.7, jberg/butterchurn, copyright 2013–2018 Jordan Berg, MIT. Version npm exacte et intégrité conservées dans package-lock.json. Bundle servi localement sous /lib/butterchurn/, licence reproduite dans public/vendor/butterchurn/LICENSE. Babel Runtime : MIT, copyright 2014-present Sebastian McKenzie and other contributors ; notice conservée dans BABEL-LICENSE. ecma-proposal-math-extensions 0.0.2 : MIT selon son manifeste npm, Rick Waldron ; manifeste conservé dans MATH-EXTENSIONS-PACKAGE.json.

public/photo-feedback.js fournit un preset original du studio : microbandes photo quantifiées, déplacement déclenché par l’audio, injection photo et feedback RGB. Le vrai moteur Butterchurn exécute les passes warp/rémanence/composition ; aucun pack de presets artistiques tiers ajouté. Photo injectée dans un sampler via un adaptateur interne fixé à la version 2.6.7. Le preset ignore les textures de bruit natives et leur hasard.

Les enveloppes basse/médium/aigu et attaques proviennent de l’analyse MP3 du studio via les variables q. La normalisation audio et les oscillographes natifs sont inutilisés ; un tableau silencieux satisfait l’API interne, sans modifier le son exporté. Simulation fixe à 60 Hz, indépendante de la fréquence 30/60 de sortie. Après un saut, reconstruction des 32 derniers pas au plus ; le poids théorique du passé antérieur est inférieur à 0,4 % au maximum de rémanence 0,84. Cette reconstruction est une approximation bornée de l’historique, pas une simulation intégrale depuis le début du morceau. Historique effacé aux changements de photo/réglages ; photo initiale injectée sans feedback noir. Les redessins en pause ne font pas avancer le feedback.

## Butterchurn — Tissage spectral

public/photo-weave.js est un preset photo original de MusicFrame Render exécuté par le vrai moteur Butterchurn 2.6.7 (MIT, copyright 2013–2018 Jordan Berg). Il partage l’adaptateur de texture photo et l’horloge 60 Hz de public/photo-feedback.js. Aucun preset artistique tiers ni autre dépendance ajoutés. Notices Butterchurn et dépendances conservées dans public/vendor/butterchurn/.

Grille de capsules horizontales/verticales alternées, couleur issue de la photo et teinte cyan/magenta réglable. Basses/attaques vers longueur et tension ; médiums vers courbure et déplacement ; aigus vers épaisseur et éclat. Masques anti-crénelés par dérivées. Mélange avec la photo originale, finesse 40–960, épaisseur, tension, couleur et rémanence réglables. Ce dessin de tissage ne provient pas d’un preset MilkDrop existant. L’historique utilise au plus 0,504 de la valeur précédente par pas et se reconstruit avec la fenêtre bornée du studio après un saut.

## MusicFrame Render — Codec granulaire

public/photo-codec.js est un effet photo original du studio, rendu avec Three.js 0.186.1 (MIT, copyright 2010–2026 three.js authors ; licence conservée dans node_modules/three/LICENSE). Aucun nouveau shader tiers ni package de codecs distribué. Les JPEG sont générés localement par l’API canvas du navigateur, aux qualités 0,01 / 0,025 / 0,06 / 0,16 / 0,4.

La photo est cadrée sur une toile 1920 × 1080 avant compression, indépendamment de la résolution de l’aperçu. Le shader mélange les cinq JPEG selon les basses, médiums et attaques du MP3. Petits déplacements de cellules et dispersion RGB supplémentaires propres au studio ; ce n’est pas un codec vidéo MPEG ni un véritable datamoshing inter-images. Les blocs DCT des JPEG gardent leur taille native ; le contrôle de finesse règle les cellules de déplacement, de 40 à 960 colonnes. Cache limité à deux photos/cadrages, textures libérées à l’éviction. Aucun historique de feedback ou cycle autonome. La compression artistique de l’image est indépendante du réglage H.264 de l’export, qui reste inchangé.

## Three.js — Plexus photo

public/photo-plexus.js reprend le principe points + segments et la transparence décroissant avec la distance de l’exemple officiel webgl_buffergeometry_drawrange.html de Three.js r186, par Fernando Serrano (fernandojsg). Three.js : MIT, copyright 2010–2026 three.js authors. Exemple original et licence conservés dans public/vendor/three-examples/. Source : https://github.com/mrdoob/three.js/blob/r186/examples/webgl_buffergeometry_drawrange.html.

L’adaptation photo et musicale est propre au studio : graphe local de voisins sur grille, diagonales alternées, échantillonnage des couleurs photo, profondeur par luminance, pose analytique depuis les bandes MP3 et attaques de 120 ms. L’algorithme natif de recherche de toutes les paires, les vitesses accumulées, rebonds dans un cube et rotation autonome ne sont pas embarqués. Le graphe borné remplace la recherche quadratique ; positions calculées directement à chaque instant audio, sans historique. Finesse 80–480, taille des particules, brillance et portée des connexions, écartement et fond photo réglables. Traits natifs LineSegments d’un pixel de rendu, points circulaires avec taille adaptée à la résolution. Aucun nouveau package ni module Stats, GUI ou OrbitControls tiers ajouté.

## MusicFrame Render — Déphasage binaire

public/photo-binary.js est un effet original du studio, rendu avec Three.js 0.186.1 (MIT, copyright 2010–2026 three.js authors ; licence dans node_modules/three/LICENSE). Aucun preset artistique tiers, shader externe ou nouvelle dépendance ajouté.

Les composantes RGB sont ramenées à huit bits et décomposées par poids 128, 64, 32, 16, 8, 4, 2, 1. Les 1–8 plans de poids fort choisis sont échantillonnés à des coordonnées décalées par cellule, puis recombinés. Les canaux rouge/bleu peuvent suivre une autre direction ; les basses, médiums, aigus et attaques MP3 règlent le déplacement et le mélange. Quand l’activité ou la réaction vaut zéro, le shader conserve la photo originale. La phase est calculée depuis le temps MP3 ; aucun état accumulé, feedback, réencodage de fichier source ni modification audio. Finesse 40–960 colonnes. La précision spatiale du traitement n’ajoute pas de détail aux photos originales.

## MusicFrame Render — Facettes cinétiques

public/photo-facets.js est un effet original du studio rendu avec Three.js 0.186.1, MIT, copyright 2010–2026 three.js authors. Licence conservée dans node_modules/three/LICENSE. Aucun shader tiers, preset artistique ou nouvelle dépendance ajouté.

La photo est découpée en paires de triangles texturés, instanciés sur le GPU. Rotation de Rodrigues autour de la diagonale de chaque cellule, élévation signée, lumière directionnelle et éclat spéculaire simples ; aucun modèle 3D reconstruit depuis les photos. Les bandes et attaques MP3 règlent l’amplitude des poses, calculées directement au temps audio. Une cible de rendu locale avec tampon de profondeur gère l’occlusion des triangles. Finesse 80–480 colonnes, rotation, relief, éclairage, écart, fond et réaction réglables. Pas de feedback, intégration physique persistante, nouvelles textures distantes ni module externe.

## glitch-canvas — Corruption JPEG

glitch-canvas 1.1.12 par snorpey / Georg Fischer, copyright (c) 2013–2017 Georg Fischer, MIT. Bundle navigateur officiel non modifié et licence conservés dans public/vendor/glitch-canvas/. Révision exacte 72283d134e9c5666d20fa985cd715c49138e1b75, correspondant au gitHead npm 1.1.12. Source : https://github.com/snorpey/glitch-canvas/tree/72283d134e9c5666d20fa985cd715c49138e1b75. Bundle et crédits intégrés conservés. Aucun module canvas natif Node installé.

public/photo-corruption.js utilise la véritable API glitch().fromImageData().toImage() : altération déterministe des octets JPEG après l’en-tête, dans des segments répartis selon iterations. Trois profils règlent les quantités de mutations et la qualité JPEG ; quatre variantes par photo/cadrage/profil, préparées à 1920 × 1080 et conservées pour deux ensembles au maximum. En cas de décodage impossible, deux essais déterministes moins altérés sont effectués, puis une erreur est signalée si aucun ne fonctionne. Mélange par cellules et attaques MP3 de 120 ms propres au studio, rendu Three.js 0.186.1 MIT. Aucune mutation des fichiers sources ni de l’audio. Finesse 40–960 pour les cellules de révélation ; les ruptures natives du flux JPEG gardent leur géométrie. Pas de datamoshing MPEG ni de simulation temporelle persistante.

## MusicFrame Render — Circuits photo

public/photo-circuit.js est un effet original du studio, rendu avec Three.js 0.186.1, MIT, copyright 2010–2026 three.js authors. Licence conservée dans node_modules/three/LICENSE. Aucun nouveau shader tiers ni package ajouté.

Pistes orthogonales calculées par distance à trois segments par cellule. Les extrémités des cellules voisines partagent la même hauteur pour connecter les pistes par rangée ; coudes, anneaux et paquets lumineux déterministes. Les couleurs proviennent de la photo, avec une teinte cyan réglable. Basses/médiums/aigus et attaques MP3 de 120 ms règlent épaisseur, position du coude et courant lumineux ; phase des paquets calculée depuis le temps MP3 et la vitesse. Sans réaction, les circuits restent statiques. Finesse 40–640 colonnes, épaisseur, halo, teinte, photo de fond et réaction réglables. Pas de rétroaction, simulation accumulée, reconstruction 3D ni nouvelle texture distante.

## MusicFrame Render — Trame CMJN

public/photo-press.js est un effet original du studio, rendu avec Three.js 0.186.1 (MIT, copyright 2010–2026 three.js authors ; licence dans node_modules/three/LICENSE). Aucun shader tiers ou package supplémentaire ajouté.

Séparation arithmétique RGB en cyan, magenta, jaune et noir ; quatre trames de points tournées à 15°, 75°, 0° et 45°, avec échantillonnage de la photo au centre de chaque cellule tournée. Composition soustractive sur blanc, sans profil ICC ni simulation physique d’impression. Les basses, médiums, aigus et attaques MP3 de 120 ms font varier la couverture des points et le décalage des plaques colorées. Les photos en niveaux de gris utilisent principalement la plaque noire. Finesse 40–960 colonnes, densité des encres, décalage, angle commun, réaction et mélange réglables. Anti-crénelage par dérivées, pas de feedback ni mouvement autonome. Les fichiers sources et l’audio restent inchangés.

## MusicFrame Render — Spectre granulaire

public/photo-spectrum.js et public/spectrum.js sont des modules originaux du studio. Rendu Three.js 0.186.1, MIT, copyright 2010–2026 three.js authors ; licence dans node_modules/three/LICENSE. Analyse FFT avec fft.js 4.0.4 déjà présent : MIT, copyright Fedor Indutny, 2017 ; licence complète dans node_modules/fft.js/README.md. Aucun nouveau package ou shader tiers ajouté.

Analyse stéréo indépendante à 24 kHz, FFT Hann de 2048 échantillons, 64 fenêtres logarithmiques entre 40 Hz et 10 kHz. Les bandes très basses peuvent partager des bins, la résolution FFT restant 11,72 Hz. Puissances des deux canaux additionnées avant moyenne ; pas de sommation des échantillons gauche/droite susceptible d’annulation. Enveloppes à 60 Hz, lissage 0,5, normalisation par le maximum spectral global du morceau et compression racine carrée, sans calibration dB.

Les microbarres de la photo prennent la fréquence selon leur colonne, graves à gauche et aigus à droite. Hauteur, lumière et décalage d’échantillonnage photo varient avec l’énergie spectrale ; attaques de 120 ms ajoutées aux accents. Texture audio RGBA8 de 64 × 1, interpolée au temps MP3 ; pas de texture flottante requise, simulation ou feedback. Finesse 40–960 colonnes, largeur, déplacement, éclat, fond et réaction réglables. Les sessions anciennes sans spectre conservent un mode compatible à partir des trois bandes existantes ; les nouveaux imports et la référence réanalysée utilisent les 64 bandes. Enveloppes et waveform historiques de la référence vérifiées identiques.

## MusicFrame Render — Radar granulaire

public/photo-radar.js est un shader original du studio avec Three.js 0.186.1 (MIT, copyright 2010–2026 three.js authors ; licence dans node_modules/three/LICENSE). Il réutilise l’envoi de texture FFT de public/photo-spectrum.js, sans changer le rendu du modèle Spectre granulaire. Analyse par fft.js 4.0.4 MIT, copyright Fedor Indutny 2017 ; licence dans node_modules/fft.js/README.md. Aucun nouveau package, preset ou shader tiers ajouté.

Les centres des grains sont calculés en coordonnées polaires, avec un nombre de secteurs proportionnel au rayon pour garder un espacement presque uniforme. La source photographique est échantillonnée au centre de chaque grain. Les 64 bandes sont réparties du grave au centre vers l’aigu à la périphérie. Taille et lumière varient avec le spectre et les attaques de 120 ms. Un balayage angulaire analytique fait ressortir les grains ; son intensité est multipliée par l’activité musicale. La longueur du sillage règle une décroissance angulaire, sans feedback ni historique d’images. Pose calculée directement au temps MP3, finesse 64–640 cercles, taille, balayage, sillage, photo de fond et réaction réglables.

## MusicFrame Render — Pixels fractals

public/photo-quadtree.js est un shader original du studio, rendu avec Three.js 0.186.1 MIT (copyright 2010–2026 three.js authors ; licence dans node_modules/three/LICENSE). Il réutilise uniquement l’envoi de texture FFT de PhotoSpectrum. fft.js 4.0.4 est sous MIT, copyright Fedor Indutny 2017, licence dans node_modules/fft.js/README.md. Aucun nouveau shader tiers ou package ajouté.

Subdivision en quatre de cellules photographiques, avec une boucle bornée à cinq lectures de niveau, soit quatre subdivisions au maximum. Le contraste est estimé par trois lectures photo par niveau ; les 64 bandes FFT et les attaques de 120 ms augmentent la subdivision. La décision est stable par cellule et temps audio, sans hasard JavaScript ni simulation accumulée. Les cellules gardent la couleur photographique échantillonnée au centre ; contours et accents lumineux réglables. Grille de départ 16–128 colonnes et 0–4 subdivisions, jusqu’à 2048 colonnes théoriques dans les zones subdivisées. L’affinement n’ajoute pas de détails absents des photos sources.

## MusicFrame Render — Champ vectoriel

public/photo-vector.js est un effet original du studio, rendu avec Three.js 0.186.1 MIT (copyright 2010–2026 three.js authors ; licence dans node_modules/three/LICENSE). Il réutilise uniquement la texture spectrale de PhotoSpectrum et l’analyse par fft.js 4.0.4 MIT, copyright Fedor Indutny 2017, licence dans node_modules/fft.js/README.md. Aucun shader tiers ou package supplémentaire ajouté.

La différence de luminance de quatre échantillons voisins estime le gradient photographique. Les flèches suivent sa tangente ; les zones sans gradient mesurable utilisent une orientation déterministe. Trois segments avec distance anti-crénelée dessinent chaque flèche. Couleur issue de la photo au centre de la cellule. Les 64 bandes FFT sont réparties de gauche à droite ; énergie et attaques de 120 ms règlent angle, longueur et éclat. Il s’agit d’un champ graphique local, sans calcul de flux optique, suivi de mouvement ou dynamique de fluide. Finesse 80–640, longueur, épaisseur, rotation musicale, photo de fond et réaction réglables. Pas de simulation accumulée, feedback ou vitesse autonome.

## MusicFrame Render — Scan temporel

public/photo-chrono.js est un effet original du studio avec Three.js 0.186.1 MIT, copyright 2010–2026 three.js authors, licence dans node_modules/three/LICENSE. Les enveloppes audio existantes sont issues de fft.js 4.0.4 MIT, copyright Fedor Indutny 2017, licence dans node_modules/fft.js/README.md. Aucun shader tiers ou nouveau package ajouté.

Une texture RGBA8 64 × 1 contient 64 mesures temporelles RMS/graves/médiums/aigus, entre l’instant courant et le passé choisi. Les échantillons sont bornés au début de la photo actuelle pour ne pas réutiliser les événements antérieurs sur une nouvelle photo. Chaque fine bande verticale utilise une pose photographique calculée depuis un instant différent de cette fenêtre : zoom, translation et rotation par audio. Les canaux rouge et bleu peuvent prendre des positions temporelles légèrement différentes. La photo reste celle actuellement sélectionnée ; aucun historique d’images réellement rendues, flux vidéo ou feedback n’est enregistré. Finesse 40–1920 bandes, fenêtre 0–1,5 s, décalage, torsion, chroma et réaction réglables. L’audio exporté n’est pas décalé.

## MusicFrame Render — Cisaillement spectral

public/photo-shear.js est un shader original du studio avec Three.js 0.186.1 MIT (copyright 2010–2026 three.js authors ; licence dans node_modules/three/LICENSE). Il réutilise uniquement l’envoi de texture FFT de PhotoSpectrum, et l’analyse par fft.js 4.0.4 MIT, copyright Fedor Indutny 2017, licence dans node_modules/fft.js/README.md. Aucun shader tiers ni nouveau package ajouté.

Chaque bande verticale choisit une fréquence parmi les 64 enveloppes mesurées, soit dans l’ordre gauche/droite, soit avec une répartition pseudo-aléatoire déterministe par bande. L’énergie règle l’étirement vertical ; la différence entre fréquences voisines règle la translation et le cisaillement. Décalage RGB supplémentaire lié à l’énergie et aux attaques de 120 ms. Grille 40–1920 bandes, étirement, cisaillement, dispersion chromatique, répartition et réaction réglables. Échantillonnage à l’instant MP3 courant, sans simulation accumulée ni historique temporel.

## MusicFrame Render — Moiré numérique

public/photo-moire.js est un shader original du studio avec Three.js 0.186.1 MIT (copyright 2010–2026 three.js authors ; licence dans node_modules/three/LICENSE). Il réutilise uniquement l’envoi de texture FFT de PhotoSpectrum, avec fft.js 4.0.4 MIT, copyright Fedor Indutny 2017, licence dans node_modules/fft.js/README.md. Aucun shader tiers ou nouveau package ajouté.

Deux trames sinusoïdales de fréquences spatiales proches (rapport 1,025) sont multipliées pour former des interférences. Un angle faible sépare les trames ; énergie locale, graves, aigus et attaques de 120 ms modulent phase et angle. La photo est modulée par ces motifs ; trois phases colorées séparées de 120° permettent une colorisation optionnelle. Les dérivées réduisent l’amplitude des trames trop fines pour la résolution de rendu afin de limiter le crénelage. Grille 40–640, angle, profondeur, colorisation, réaction et mélange réglables. Pas d’oscillateur temporel autonome, simulation ou feedback.

## Fosfora — Panneau lumineux (Pegboard)

public/photo-pegboard.js adapte la palette de huit couleurs, la distance chromatique normalisée par luminance, le seuil Bayer 4 × 4, la sélection d’une minorité sur les attaques et l’éclairage du fond de Pegboard, Fosfora, révision 8732bf30898c6fd693061e6053860161b2f60181. MIT, copyright 2025–2026 Kevin Raymond. Sources originales assets/shaders/pegboard_sim.wgsl, pegboard_bg.wgsl, assets/effects/pegboard.pfx et licence conservées dans public/vendor/fosfora/. Source : https://github.com/kevinraymond/fosfora/tree/8732bf30898c6fd693061e6053860161b2f60181.

Le studio utilise une grille Three.js de points photographiques et un déplacement analytique depuis les attaques de 200 ms ; il ne reprend pas le solveur ressort/gravité, le cycle de vie ou l’allocation GPU compute natifs. Retour dans les trous calculé avec la décroissance de l’attaque, sans état accumulé. Polarité fixée aux zones lumineuses pour garder les photos positives, là où l’effet natif propose aussi une polarité d’ombres. Palette huit couleurs originale mélangée avec les couleurs source, tramage et seuil réglables ; fond plastique et éclairage central repris du shader de fond. Finesse 80–640 colonnes, points ronds ombrés, taille liée au rendu 1080p. Aucun nouveau package ou Ableton Link ajouté. Three.js 0.186.1 MIT reste le moteur de rendu.


## FFT Visualizer — Stereo glow

MIT, copyright (c) 2026 Wouter Vernaillen. Source: https://github.com/harmonics-audio/fft-visualizer, révision fdf62a9a30607892a71170f446aad7c4073f5f69. Licence complète et sources TypeScript non modifiées dans public/vendor/fft-visualizer/. Le shader original et les fonctions de traitement et de dégradé sont utilisés ; MusicFrame Render adapte la composition Three.js, le placement, l’opacité et le traitement déterministe des données du MP3. Aucune dépendance Vue/React, capture microphone, WebSocket ou Rust/WASM n’est embarquée.

## Photo sculptée 3D (essai)

Implémentation originale MusicFrame Render : maillage continu, relief depuis la luminance lissée, normales recalculées, éclairage et déformation audio déterministes. Moteur Three.js 0.186.1 sous MIT, Copyright © 2010–2026 three.js authors ; licence complète dans `node_modules/three/LICENSE`. Source : https://github.com/mrdoob/three.js/tree/r186 ; documentation de la technique de déplacement : https://threejs.org/docs/pages/MeshStandardMaterial.html#displacementMap. Aucun modèle de profondeur ni poids externes. Il s’agit d’un relief artistique, pas d’une estimation de profondeur sémantique.

## Strates holographiques (essai)

Compositing original MusicFrame Render de plans photo rigides, segmentés par luminance. Moteur Three.js 0.186.1, MIT, Copyright © 2010–2026 three.js authors, licence complète dans `node_modules/three/LICENSE`. Source : https://github.com/mrdoob/three.js/tree/r186 ; instanciation : https://threejs.org/docs/pages/InstancedBufferGeometry.html. Aucun modèle, poids ou média externe ajouté.

## Flux prismatique 3D (essai)

Effet original MusicFrame Render : prismes triangulaires texturés, géométrie fermée instanciée, caméra perspective, circulation GPU et mapping audio déterministes. Three.js 0.186.1, MIT, Copyright © 2010–2026 three.js authors ; texte complet dans `node_modules/three/LICENSE`. Source : https://github.com/mrdoob/three.js/tree/r186. Aucun nouveau média ou modèle externe.

## Ondes filaires 3D (essai)

Effet original MusicFrame Render : rubans photo instanciés en perspective, relief piloté par un historique du spectre audio mesuré. Three.js 0.186.1 sous MIT, Copyright © 2010–2026 three.js authors, licence complète dans `node_modules/three/LICENSE`. Source : https://github.com/mrdoob/three.js/tree/r186. Aucun modèle ou média externe ajouté.

## Portail rythmique 3D (essai)

Effet original MusicFrame Render : partition rectangulaire de photo, cadres solides instanciés et enveloppes courtes déclenchées par les attaques mesurées du MP3. Three.js 0.186.1 sous MIT, Copyright © 2010–2026 three.js authors, licence complète dans `node_modules/three/LICENSE`. Source : https://github.com/mrdoob/three.js/tree/r186. Aucun modèle ou média externe.

## Flux microgranulaire (essai)

Effet original MusicFrame Render : déplacement local de la photo dans un champ de flux, micrograins, parallaxe légère selon la luminance et traînées spatiales déclenchées par le MP3. Three.js 0.186.1, MIT, Copyright © 2010–2026 three.js authors. Licence complète : `node_modules/three/LICENSE`. Source : https://github.com/mrdoob/three.js/tree/r186. Aucun média externe ajouté.

## Lamelles de phase (essai)

Effet original MusicFrame Render : plis et glissements locaux de la photo dans un shader, ombres de relief et micrograins réactifs au MP3. Three.js 0.186.1 sous MIT ; Copyright © 2010–2026 three.js authors, licence complète `node_modules/three/LICENSE`. Source : https://github.com/mrdoob/three.js/tree/r186. Aucun média ni modèle externe ajouté.

## Essaim de données (essai)

Effet original MusicFrame Render : microfragments photo instanciés, jets et traînées calculés sur GPU en fonction des attaques du MP3, parallaxe en plans à caméra fixe. Three.js 0.186.1 sous MIT, Copyright © 2010–2026 three.js authors. Licence complète `node_modules/three/LICENSE` ; https://github.com/mrdoob/three.js/tree/r186. Aucun média externe ajouté.

## Rotation orbitale (essai)

Effet original MusicFrame Render : rotation 2D de la photo selon une intégrale audio et des enveloppes de kicks, recadrage analytique autour du pivot, micrograin facultatif. Three.js 0.186.1 MIT ; Copyright © 2010–2026 three.js authors. Licence complète `node_modules/three/LICENSE` ; https://github.com/mrdoob/three.js/tree/r186. Aucun média externe ajouté.
