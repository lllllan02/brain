import {Vector3} from 'three';
import {starCluster} from './starCluster.js';

// Reassign the existing volume samples to semantic regions. The complete
// point cloud stays spherical: no gaps between isolated satellite clusters.
export function sphericalGroups(data, overview, groups, basis) {
  let source = overview;
  if (!source.some(value => value !== 0)) source = starCluster(data.nodes.map(node => node.id), Math.max(55, Math.cbrt(data.nodes.length) * 28));
  const slots = data.nodes.map((node, i) => ({id:node.id, point:new Vector3().fromArray(source, i * 3).multiplyScalar(1.12)}));
  const sphereRadius = Math.max(30, ...slots.map(slot => slot.point.length()));
  const positions = new Float32Array(overview.length);
  const remaining = new Set(slots);
  const ranked = [...groups].sort((a,b) => b.members.length - a.members.length || a.id.localeCompare(b.id));
  ranked.forEach((group, rank) => {
    const y = 1 - 2 * (rank + .5) / ranked.length, ring = Math.sqrt(1 - y * y), angle = rank * Math.PI * (3 - Math.sqrt(5));
    const direction = basis.right.clone().multiplyScalar(Math.cos(angle) * ring)
      .addScaledVector(basis.up, y).addScaledVector(basis.normal, Math.sin(angle) * ring);
    const candidates = [...remaining].sort((a,b) => {
      const score = slot => slot.point.dot(direction) / (slot.point.length() || 1);
      return score(b) - score(a) || a.id.localeCompare(b.id);
    }).slice(0, group.members.length);
    candidates.forEach(slot => remaining.delete(slot));
    const center = new Vector3();
    // Prefer nearby destinations within each region to reduce travel.
    for (const i of [...group.members].sort((a,b) => data.nodes[a].id.localeCompare(data.nodes[b].id))) {
      const origin = new Vector3().fromArray(source, i * 3);
      let best = 0;
      for (let j = 1; j < candidates.length; j++) if (candidates[j].point.distanceToSquared(origin) < candidates[best].point.distanceToSquared(origin)) best = j;
      const [slot] = candidates.splice(best, 1);
      slot.point.toArray(positions, i * 3); center.add(slot.point);
    }
    center.divideScalar(group.members.length || 1);
    group.center = center.toArray();
    group.radius = Math.max(10, ...group.members.map(i => new Vector3().fromArray(positions, i * 3).distanceTo(center)));
    group.labelPosition = (center.lengthSq() > 1 ? center.clone().normalize() : direction).multiplyScalar(sphereRadius * 1.06).toArray();
  });
  return {...basis, groups, positions, spherical:true, sphereRadius};
}

// Angular motion preserves depth and the globe's volume throughout the morph,
// including antipodal paths and interrupted category/directory switches.
export function interpolateSphere(from, to, progress, output) {
  const k = progress * progress * (3 - 2 * progress);
  const a = new Vector3(), b = new Vector3(), axis = new Vector3();
  for (let i = 0; i < output.length; i += 3) {
    a.fromArray(from,i); b.fromArray(to,i);
    const ra = a.length(), rb = b.length();
    if (ra < .001 || rb < .001) a.lerp(b,k).toArray(output,i);
    else {
      a.divideScalar(ra); b.divideScalar(rb);
      const dot = Math.max(-1,Math.min(1,a.dot(b)));
      axis.crossVectors(a,b);
      if (axis.lengthSq() < 1e-10) axis.crossVectors(a, Math.abs(a.y) < .9 ? new Vector3(0,1,0) : new Vector3(1,0,0));
      a.applyAxisAngle(axis.normalize(), Math.acos(dot) * k)
        .multiplyScalar((ra + (rb - ra) * k) * (1 + .025 * Math.sin(Math.PI * k))).toArray(output,i);
    }
  }
  return output;
}
