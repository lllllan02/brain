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
  // A deterministic spiral disk opens into an oblate shell, then a sphere.
  // Category references never pull these slots out of their regular arrangement.
  const depth = preset === 'galaxy' ? 0 : style.depth;
  const stretch = Math.sqrt(Math.max(.5, Math.min(2, aspect)));
  const slots = groups.map((_, i) => {
    if (groups.length === 1) return new Vector3();
    const t = (i + .5) / groups.length;
    const angle = i * Math.PI * (3 - Math.sqrt(5));
    const latitude = 1 - 2 * t;
    const disk = Math.sqrt(t), sphere = Math.sqrt(1 - latitude * latitude);
    const r = disk * (1 - depth) + sphere * depth;
    // Ease out the viewport stretch so deep space remains a true sphere.
    const sx = 1 + (stretch - 1) * (1 - depth);
    const sy = 1 + (1 / stretch - 1) * (1 - depth);
    return new Vector3(Math.cos(angle) * r * sx, Math.sin(angle) * r * sy, latitude * depth);
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
    ordered.forEach((i, rank) => {
      delays[i] = categorySeed(group.id) * .12;
      const tangent = new Vector3().crossVectors(normal, new Vector3(...group.center)).clampLength(0, 35);
      tangent.toArray(tangents, i * 3);
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
