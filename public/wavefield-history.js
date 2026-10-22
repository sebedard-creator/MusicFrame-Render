import { sampleSpectrum,spectrumBands } from './spectrum.js';

// Analytic audio waterfall: each row samples a known MP3 instant.
// No prior rendered frame or wall-clock simulation is required.
export function wavefieldHistory(analysis,time,rows,seconds,sensitivity,strength,target){
  if(!Number.isInteger(rows)||rows<48||rows>256||!Number.isFinite(seconds)||seconds<.1||seconds>3)throw new Error('Historique filaire invalide.');
  const data=target?.length===rows*spectrumBands?target:new Uint8Array(rows*spectrumBands);data.fill(0);
  for(let row=0;row<rows;row++){
    const sampleTime=time-row/(rows-1)*seconds;if(sampleTime<0)continue;
    const bands=sampleSpectrum(analysis,sampleTime,sensitivity);
    for(let band=0;band<spectrumBands;band++)data[row*spectrumBands+band]=Math.round(Math.min(1.5,Math.max(0,bands[band]*strength))/1.5*255);
  }
  return data;
}
