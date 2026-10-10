import {BufferAttribute, type BufferGeometry} from 'three';

// Animate actual incident edges toward the reading node, independent of citation
// direction. Fading previous selections and unrelated edges stay static.
export function selectionFlowAttributes(geometry: BufferGeometry,
  links: readonly ({source: number; target: number} | undefined)[], segments: number,
  active: number, targets: ReadonlySet<number>, indices: number[]): number {
  const along = new Float32Array(links.length * segments * 2);
  const seed = new Float32Array(along.length);
  let count = 0;
  links.forEach((link, i) => {
    const incident = active >= 0 && link && (link.source === active || link.target === active) && targets.has(indices[i]!);
    const rank = incident ? count++ : -1;
    for (let v = 0; v < segments * 2; v++) {
      const t = (Math.floor(v / 2) + v % 2) / segments;
      along[i * segments * 2 + v] = link?.source === active ? 1 - t : t;
      seed[i * segments * 2 + v] = rank;
    }
  });
  geometry.setAttribute('aFlowAlong', new BufferAttribute(along, 1));
  geometry.setAttribute('aFlowSeed', new BufferAttribute(seed, 1));
  geometry.setAttribute('aFlowSpan', new BufferAttribute(new Float32Array(along.length), 1));
  return count;
}
