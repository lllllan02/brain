// Stable, centrally concentrated volume samples. Best-candidate spacing keeps
// individual documents selectable without turning the cloud into a lattice.
export function starCluster(ids, radius, depth = 1) {
  if (ids.length < 2) return new Float32Array(ids.length * 3);
  const points = new Map(), placed = [];
  for (const id of [...ids].sort()) {
    let state = 2166136261;
    for (const c of id) state = Math.imul(state ^ c.charCodeAt(0), 16777619);
    const random = () => {
      state += 0x6D2B79F5;
      let t = Math.imul(state ^ state >>> 15, 1 | state);
      t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
    const r = radius * Math.pow(random(), .65);
    let best, distance = -1;
    for (let attempt = 0; attempt < 16; attempt++) {
      const z = random() * 2 - 1, angle = random() * Math.PI * 2;
      const xy = Math.sqrt(1 - z * z);
      const point = [r * xy * Math.cos(angle), r * xy * Math.sin(angle), r * z * depth];
      const nearest = placed.reduce((min, p) => Math.min(min, point.reduce((sum, v, a) => sum + (v - p[a]) ** 2, 0)), Infinity);
      if (nearest > distance) {best = point; distance = nearest;}
    }
    points.set(id, best); placed.push(best);
  }
  return new Float32Array(ids.flatMap(id => points.get(id)));
}
