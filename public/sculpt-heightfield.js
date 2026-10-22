// Original luminance bas-relief preparation. No semantic depth model is used.
export function sculptHeightfield(rgba, width, height, smoothing) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 2 || height < 2 || rgba.length !== width * height * 4) throw new Error('Dimensions de relief invalides.');
  const values = new Float32Array(width * height);
  for (let i = 0; i < values.length; i++) values[i] = (.2126 * rgba[i*4] + .7152 * rgba[i*4+1] + .0722 * rgba[i*4+2]) / 255;
  // Three bounded separable box passes approximate a Gaussian blur.
  const radius = Math.max(0, Math.round(Math.max(width, height) * Math.max(0, Math.min(1, smoothing)) * .035));
  if (radius) {
    const temporary = new Float32Array(values.length);
    const blur = (source, target, horizontal) => {
      const outer = horizontal ? height : width, inner = horizontal ? width : height;
      const index = (a,b) => horizontal ? a * width + b : b * width + a;
      for(let a=0;a<outer;a++) {
        let sum=0;
        for(let b=-radius;b<=radius;b++) sum+=source[index(a, Math.max(0,Math.min(inner-1,b)))];
        for(let b=0;b<inner;b++) {
          target[index(a,b)]=sum/(radius*2+1);
          sum+=source[index(a,Math.min(inner-1,b+radius+1))]-source[index(a,Math.max(0,b-radius))];
        }
      }
    };
    for(let pass=0;pass<3;pass++){ blur(values,temporary,true); blur(temporary,values,false); }
  }
  const slopes = new Float32Array(values.length * 2);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
    const left=Math.max(0,x-1),right=Math.min(width-1,x+1),up=Math.max(0,y-1),down=Math.min(height-1,y+1),i=y*width+x;
    slopes[i*2]=(values[y*width+right]-values[y*width+left])*(width-1)/(right-left);
    // Image rows point down; the geometry's vertical axis points up.
    slopes[i*2+1]=(values[up*width+x]-values[down*width+x])*(height-1)/(down-up);
  }
  return { values, slopes };
}

// Stateless audio pose: repeated seeks and offline frames give the same result.
export function sculptPose(config, time, bands, impact = 0) {
  const strength = config.intensity ?? 1, reaction = (config.sculptReaction ?? 1) * strength;
  const bass = bands[1] * reaction, mid = bands[2] * reaction, high = bands[3] * reaction;
  const hit = impact * reaction, phase = time * (config.speed ?? 1);
  const orbit = config.sculptOrbit ?? .65;
  return {
    depth: (config.sculptDepth ?? .6) * 170 * (1 + bass * .85 + hit * .6),
    rotationY: orbit * (.28 + Math.sin(phase * .65) * bass * .20 + hit * .14),
    rotationX: orbit * (-.12 + Math.cos(phase * .43) * mid * .12),
    wave: (config.sculptWave ?? .35) * (bass * 20 + hit * 30),
    lightX: -.4 + Math.sin(phase * .5) * mid * .8,
    lightY: .65 + high * .3,
    push: (config.zoom ?? .25) * strength * bands[1] * 45,
    phase,
  };
}
