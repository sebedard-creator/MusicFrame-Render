// Bounded local graph: horizontal/vertical links plus alternating diagonals.
export function plexusGrid(columns) {
  if (!Number.isInteger(columns) || columns < 80 || columns > 480) throw new Error('Densité Plexus invalide.');
  const rows = Math.round(columns * 9 / 16);
  const points = new Float32Array(columns * rows * 3);
  const edgeCount = (columns - 1) * rows + columns * (rows - 1) + (columns - 1) * (rows - 1);
  const lines = new Float32Array(edgeCount * 6), neighbors = new Float32Array(edgeCount * 4);
  const at = (x, y) => [(x + .5) / columns * 2 - 1, (y + .5) / rows * 2 - 1];
  let p = 0, e = 0, n = 0;
  const link = (a, b) => {
    lines.set([a[0], a[1], 0, b[0], b[1], 0], e); e += 6;
    neighbors.set([b[0], b[1], a[0], a[1]], n); n += 4;
  };
  for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
    const a = at(x, y); points.set([a[0], a[1], 0], p); p += 3;
    if (x + 1 < columns) link(a, at(x + 1, y));
    if (y + 1 < rows) link(a, at(x, y + 1));
    if (x + 1 < columns && y + 1 < rows) {
      if ((x + y) % 2) link(at(x + 1, y), at(x, y + 1));
      else link(a, at(x + 1, y + 1));
    }
  }
  return { points, lines, neighbors, rows, edgeCount };
}
