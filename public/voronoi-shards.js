// Seed layout from Fosfora raster_sim.wgsl; hash from particle_lib.wgsl.
// MIT, Copyright 2025–2026 Kevin Raymond. Half-plane clipping: MusicFrame Render.
export const shardHash = value => { const n = Math.sin(value) * 43758.5453123; return n - Math.floor(n); };

export function buildShardCells(count = 32) {
  const seeds = Array.from({ length: count }, (_, i) => [shardHash(i * 127.1 + 5.3) * 1.8 - .9, shardHash(i * 311.7 + 11.7) * 1.8 - .9]);
  return seeds.map((center, id) => {
    let polygon = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (let j = 0; j < count && polygon.length; j++) {
      if (j === id) continue;
      const other = seeds[j], nx = other[0] - center[0], ny = other[1] - center[1];
      const limit = (other[0] ** 2 + other[1] ** 2 - center[0] ** 2 - center[1] ** 2) / 2;
      const output = [];
      for (let k = 0; k < polygon.length; k++) {
        const a = polygon[k], b = polygon[(k + 1) % polygon.length];
        const da = a[0] * nx + a[1] * ny - limit, db = b[0] * nx + b[1] * ny - limit;
        if (da <= 0) output.push(a);
        if ((da <= 0) !== (db <= 0)) {
          const t = da / (da - db);
          output.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
        }
      }
      polygon = output;
    }
    const angle = shardHash(id * 37.1 + 7) * 6.2831853;
    return { id, center, polygon, motion: [Math.cos(angle), Math.sin(angle), (shardHash(id * 53.3 + 13) - .5) * 5, .5 + shardHash(id * 71.7 + 23)] };
  });
}
