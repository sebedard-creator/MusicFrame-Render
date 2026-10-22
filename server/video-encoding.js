// Bound the H.264 decoder workload even on grain/noise-heavy frames.
// CRF remains the quality target; VBV only constrains otherwise excessive peaks.
export function videoEncodingArgs(fps, { encoder='libx264', youtube=false } = {}) {
  if (![30, 60].includes(fps)) throw new Error('Cadence vidéo invalide.');
  if(!['libx264','h264_nvenc'].includes(encoder))throw new Error('Encodeur vidéo invalide.');
  const quality=encoder==='h264_nvenc'?['-c:v',encoder,'-preset','p6','-tune','hq','-rc','vbr','-cq','18','-b:v','0']:['-c:v',encoder,'-preset','medium','-crf','18'];
  return [...quality,
    '-maxrate', '32M', '-bufsize', '32M', '-profile:v', 'high', '-level:v', '4.2',
    '-g', String(youtube?fps/2:fps*2), ...(encoder==='libx264'?['-keyint_min',String(youtube?fps/2:fps)]:[]),
    ...(youtube?['-bf','2']:[]),'-refs','3',
    '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
    ...(youtube?['-color_range','tv']:[])];
}
