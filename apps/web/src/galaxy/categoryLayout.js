import {Vector3} from 'three';
import {categoryStyle, categorySeed} from './categoryStyles.js';

const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };

// A second display layout only: note IDs, references and the force simulation stay intact.
export function categoryLayout(data, overview, {aspect = 1.6, elevation = 18, preset = 'nebula'} = {}) {
  const style = categoryStyle(preset);
  const memberships = new Map();
  data.nodes.forEach((node, i) => {
    const id = node.folderTop || 'uncategorized';
    if (!memberships.has(id)) memberships.set(id, []);
    memberships.get(id).push(i);
  });
  const normal = new Vector3(Math.cos(elevation * Math.PI / 180), Math.sin(elevation * Math.PI / 180), .35).normalize();
  const right = new Vector3().crossVectors(new Vector3(0, 1, 0), normal).normalize();
  const up = new Vector3().crossVectors(normal, right);
  const groups = [...memberships].sort(([a], [b]) => a.localeCompare(b)).map(([id, members]) => ({
    id, members, radius: Math.min(90, 24 + Math.sqrt(members.length) * 9), center: [0, 0, 0],
  }));
  const stretch = Math.sqrt(Math.max(.5, Math.min(2, aspect)));
  let slot = 0;
  const placed = [];
  for (const group of groups) {
    let x, y;
    do {
      const angle = slot * 2.3999632297;
      const r = groups.length === 1 ? 0 : 105 * Math.sqrt(++slot);
      x = Math.cos(angle) * r * stretch; y = Math.sin(angle) * r / stretch;
    } while (placed.some(other => Math.hypot(x - other.x, y - other.y) < group.radius + other.radius + style.gap));
    placed.push({x, y, radius: group.radius});
    const depth = (categorySeed(group.id) - .5) * Math.hypot(x, y) * 1.25 * style.depth;
    group.center = right.clone().multiplyScalar(x).addScaledVector(up, y).addScaledVector(normal, depth).toArray();
  }
  // Center the arrangement, independently of uneven category sizes.
  const center = new Vector3();
  groups.forEach(group => center.add(new Vector3(...group.center)));
  if (groups.length) center.divideScalar(groups.length);
  const positions = new Float32Array(overview.length);
  for (const group of groups) {
    group.center = new Vector3(...group.center).sub(center).toArray();
    const ordered = [...group.members].sort((a, b) => data.nodes[a].id.localeCompare(data.nodes[b].id));
    ordered.forEach((i, rank) => {
      const r = ordered.length > 1 ? group.radius * Math.sqrt((rank + .5) / ordered.length) : 0;
      const angle = r / group.radius * 5.2 + (rank % 2) * Math.PI;
      const thickness = ordered.length > 1 ? Math.sqrt(group.radius ** 2 - r ** 2) : 0;
      // The same real notes form spiral arms; increasing depth lifts them out
      // of the disk without replacing them with decorative particles or maps.
      const offset = right.clone().multiplyScalar(Math.cos(angle) * r)
        .addScaledVector(up, Math.sin(angle) * r * (.6 + .25 * style.depth))
        .addScaledVector(normal, (categorySeed(data.nodes[i].id) * 2 - 1) * thickness * style.depth);
      for (let a = 0; a < 3; a++) positions[i * 3 + a] = group.center[a] + offset.getComponent(a);
    });
  }
  return {groups, positions, right, up, normal};
}

// The expansion contracts briefly, overshoots radially, then settles. Capturing
// the current frame as `from` makes rapid toggles continuous and reversible.
export function interpolateCategories(from, to, progress, expanding, output) {
  const p = Math.max(0, Math.min(1, progress));
  let a, b;
  if (!expanding) { b = smooth(p); a = 1 - b; }
  else if (p < .18) { a = 1 - .72 * smooth(p / .18); b = 0; }
  else {
    const t = (p - .18) / .82;
    b = t < .65 ? 1.10 * (1 - Math.pow(1 - t / .65, 3)) : 1.10 - .10 * smooth((t - .65) / .35);
    a = .28 * Math.pow(1 - t, 3);
  }
  for (let i = 0; i < output.length; i++) output[i] = from[i] * a + to[i] * b;
  return output;
}

export const categoryEase = smooth;
