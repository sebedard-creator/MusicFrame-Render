import { PhotoFeedback } from './photo-feedback.js';

// Original photo preset for Butterchurn 2.6.7 (MIT), MusicFrame Render.
// The native warp/feedback pipeline renders interlaced photo-coloured filaments.
export class PhotoWeave extends PhotoFeedback {
  constructor() {
    super();
    this.warpShader = `uniform sampler2D sampler_photo;
shader_body {
  vec2 grid = vec2(q7, max(12.0, q7 / 1.7777778));
  vec2 warped = uv_orig;
  warped.x += sin(uv_orig.y*36.0+q14*.7) * q6 * (q1*.018+q4*.008);
  warped.y += cos(uv_orig.x*31.0-q14*.6) * q6 * q2*.012;
  vec2 cell = floor(warped * grid);
  vec2 local = fract(warped * grid) - .5;
  float parity = mod(cell.x + cell.y, 2.0);
  float strain = q6 * (q1 * .7 + q4 * .8);
  float wave = sin(cell.y * .12 + q14 * 2.0) * q2 * q6;
  vec2 sampleUv = (cell + .5) / grid;
  sampleUv = (sampleUv - .5) * vec2(q10, q11) / q12 + .5;
  vec3 photo = texture(sampler_photo, sampleUv).rgb;
  if (sampleUv.x < 0.0 || sampleUv.y < 0.0 || sampleUv.x > 1.0 || sampleUv.y > 1.0) photo = vec3(0.0);
  float luma = dot(photo, vec3(.2126,.7152,.0722));
  float halfWidth = .025 + q16 * .19 + min(1.5,q3) * q6 * .055;
  float halfLength = clamp(.12 + luma * .3 + strain * .12, .1, .49);
  vec2 thread = parity < .5 ? local : local.yx;
  thread.y -= sin(thread.x * 5.0 + cell.y * .4 + q14 * 3.0) * wave * .12;
  float dist = length(vec2(max(0.0,abs(thread.x)-halfLength+halfWidth), thread.y)) - halfWidth;
  float aa = max(fwidth(dist), .004);
  float mask = 1.0 - smoothstep(-aa,aa,dist);
  vec3 accent = mix(vec3(.18,.85,1.0), vec3(.95,.28,.75), parity);
  vec3 ink = mix(photo, accent * luma, q8);
  float sparkle = pow(max(0.0,1.0-length(local)*2.0),8.0) * q3 * q6;
  vec3 woven = ink * mask * (1.2 + strain * .6) + accent * luma * sparkle;
  vec2 historyUv = uv;
  historyUv.x += (parity < .5 ? 1.0 : -1.0) * q6 * (q1 * .4 + q4) / grid.x;
  historyUv.y += wave * .3 / grid.y;
  vec3 history = texture(sampler_main,historyUv).rgb;
  float memory = q5 * clamp(q1*.5+q2*.3+q4*.5,0.0,1.0);
  woven = woven * (1.0-memory*.45) + history * memory * .6;
  vec2 rawUv = (uv_orig-.5)*vec2(q10,q11)/q12+.5;
  vec3 original = texture(sampler_photo,rawUv).rgb;
  if (rawUv.x < 0.0 || rawUv.y < 0.0 || rawUv.x > 1.0 || rawUv.y > 1.0) original=vec3(0.0);
  ret = mix(original,woven,q9*q13);
}
`;
  }
  draw(image, config, time, sampleFrame, width, height) {
    return super.draw(image, { ...config,
      feedbackMemory: config.weaveMemory ?? .4,
      feedbackShift: config.weaveTension ?? .6,
      feedbackColumns: config.weaveColumns ?? 240,
      feedbackChroma: config.weaveTint ?? .5,
      feedbackPhoto: config.weaveMix ?? 1,
    }, time, sampleFrame, width, height);
  }
}
