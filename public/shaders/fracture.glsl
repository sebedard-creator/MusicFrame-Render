// MusicFrame Render: deterministic photo slices and block displacement.
uniform sampler2D inputTexture;
uniform float pattern;
uniform float amount;
uniform float bands;
uniform float displacement;
uniform float blocks;
uniform float grain;
varying vec2 vUv;

float hash21(vec2 p) {
  vec3 q = fract(vec3(p.x, p.y, p.x) * vec3(.1031, .1030, .0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

void main() {
  // The audio transient chooses the pattern; it stays still between attacks.
  float tick = pattern;
  float rows = max(8.0, floor(bands));
  float row = floor(vUv.y * rows);
  float bandSeed = hash21(vec2(row + 5.0, tick));
  vec2 uv = vUv;
  float activeBand = step(.63, bandSeed);
  float offset = (hash21(vec2(row, tick + 21.0)) - .5) * .34;
  uv.x += offset * activeBand * displacement * amount;

  float column = floor(vUv.x * 12.0);
  float fragmentSeed = hash21(vec2(column + row * 17.0, tick + 113.0));
  float activeBlock = step(1.0 - blocks * .45, fragmentSeed);
  vec2 blockOffset = vec2(hash21(vec2(column + 9.0, row + tick)), hash21(vec2(row + 7.0, column + tick))) - .5;
  uv += activeBlock * blocks * amount * blockOffset * vec2(.25, .16);
  uv = fract(uv);
  vec3 color = texture2D(inputTexture, uv).rgb;
  float noise = hash21(floor(vUv * vec2(1920.0, 1080.0)) + tick * vec2(17.0, 43.0)) - .5;
  color += noise * grain * amount * .4;
  gl_FragColor = vec4(color, 1.0);
}
