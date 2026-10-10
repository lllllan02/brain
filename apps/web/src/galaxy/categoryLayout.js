import {starCluster} from './starCluster.js';
import {Vector3} from 'three';
import {categoryStyle, categorySeed} from './categoryStyles.js';

const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };

// A second display layout only: note IDs, references and the force simulation stay intact.
export function categoryLayout(data, overview, {aspect = 1.6, elevation = 18, preset = 'nebula', grouping = 'category'} = {}) {
  const style = categoryStyle(preset);
  const memberships = new Map();
  data.nodes.forEach((node, i) => {
    const id = grouping === 'collection' ? `collection:${node.collection}` : node.folderTop || 'uncategorized';
    if (!memberships.has(id)) memberships.set(id, []);
    memberships.get(id).push(i);
  });
  const normal = new Vector3(Math.cos(elevation * Math.PI / 180), Math.sin(elevation * Math.PI / 180), .35).normalize();
  const right = new Vector3().crossVectors(new Vector3(0, 1, 0), normal).normalize();
  const up = new Vector3().crossVectors(normal, right);
  const groups = [...memberships].sort(([a], [b]) => a.localeCompare(b)).map(([id, members]) => ({
    id, members, radius: Math.min(160, 22 + Math.sqrt(members.length) * 6), center: [0, 0, 0],
  }));
  // Keep group centers on the viewing plane so directory labels and small
  // groups remain distinct; depth belongs inside each individual star cluster.
  const stretch = Math.sqrt(Math.max(.5, Math.min(2, aspect)));
  const slots = groups.map((_, i) => {
    if (groups.length === 1) return new Vector3();
    const r = Math.sqrt((i + .5) / groups.length);
    const angle = i * Math.PI * (3 - Math.sqrt(5));
    return new Vector3(Math.cos(angle) * r * stretch, Math.sin(angle) * r / stretch, 0);
  });
  // Uniform scaling preserves the pattern while reserving room for unequal
  // note counts; avoid per-category forces that turn the pattern into a tangle.
  let scale = 0;
  for (let i = 0; i < groups.length; i++) for (let j = i + 1; j < groups.length; j++) {
    scale = Math.max(scale, (groups[i].radius + groups[j].radius + style.gap) / slots[i].distanceTo(slots[j]));
  }
  groups.forEach((group, i) => {
    const p = slots[i].multiplyScalar(scale);
    group.center = right.clone().multiplyScalar(p.x).addScaledVector(up, p.y).addScaledVector(normal, p.z).toArray();
  });
  // Center the arrangement, independently of uneven category sizes.
  const center = new Vector3();
  groups.forEach(group => center.add(new Vector3(...group.center)));
  if (groups.length) center.divideScalar(groups.length);
  const positions = new Float32Array(overview.length);
  const delays = new Float32Array(data.nodes.length), tangents = new Float32Array(overview.length);
  for (const group of groups) {
    group.center = new Vector3(...group.center).sub(center).toArray();
    const ordered = [...group.members].sort((a, b) => data.nodes[a].id.localeCompare(data.nodes[b].id));
    const cloud = starCluster(ordered.map(i => data.nodes[i].id), group.radius, Math.max(.08, style.depth));
    ordered.forEach((i, rank) => {
      delays[i] = categorySeed(group.id) * .12;
      const tangent = new Vector3().crossVectors(normal, new Vector3(...group.center)).clampLength(0, 35);
      tangent.toArray(tangents, i * 3);
      const offset = right.clone().multiplyScalar(cloud[rank * 3])
        .addScaledVector(up, cloud[rank * 3 + 1] * .88)
        .addScaledVector(normal, cloud[rank * 3 + 2]);
      for (let a = 0; a < 3; a++) positions[i * 3 + a] = group.center[a] + offset.getComponent(a);
    });
  }
  return {groups, positions, right, up, normal, delays, tangents};
}

// The expansion contracts briefly, overshoots radially, then settles. Capturing
// the current frame as `from` makes rapid toggles continuous and reversible.
export function interpolateCategories(from, to, progress, expanding, output, motion) {
  if (progress <= 0) { output.set(from); return output; }
  if (progress >= 1) { output.set(to); return output; }
  for (let node = 0; node < output.length / 3; node++) {
    const delay = expanding ? motion?.delays[node] || 0 : 0;
    const p = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)));
    let a, b;
    if (!expanding) { b = smooth(p); a = 1 - b; }
    else if (p < .18) { a = 1 - .72 * smooth(p / .18); b = 0; }
    else {
      const t = (p - .18) / .82;
      b = t < .65 ? 1.10 * (1 - Math.pow(1 - t / .65, 3)) : 1.10 - .10 * smooth((t - .65) / .35);
      a = .28 * Math.pow(1 - t, 3);
    }
    const drift = expanding ? Math.sin(p * Math.PI) * (1 - p) : 0;
    for (let axis = 0; axis < 3; axis++) {
      const i = node * 3 + axis;
      output[i] = from[i] * a + to[i] * b + (motion?.tangents[i] || 0) * drift;
    }
  }
  return output;
}

export const categoryEase = smooth;

// Reading uses a bounded neighbourhood, not every cluster in the library.
export function readingNeighborhood(data, positions, index, grouping, limit = 12) {
  if (index < 0 || !data.nodes[index]) return null;
  const node = data.nodes[index], anchor = new Vector3().fromArray(positions, index * 3);
  const related = new Set();
  for (const link of data.links || []) {
    if (link.source === index) related.add(link.target);
    if (link.target === index) related.add(link.source);
  }
  const key = grouping === 'collection' ? 'collection' : 'folderTop';
  const nearest = data.nodes.flatMap((candidate, i) => {
    if (i === index || candidate[key] !== node[key]) return [];
    const distance = new Vector3().fromArray(positions, i * 3).distanceTo(anchor);
    return [{i, distance, score: distance * (related.has(i) ? .65 : 1)}];
  }).sort((a,b) => a.score - b.score || a.i - b.i).slice(0, limit);
  return {indices: new Set([index, ...nearest.map(item => item.i)]), radius: Math.max(28, ...nearest.map(item => item.distance))};
}
