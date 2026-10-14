import type { GalaxyLabel } from '../galaxy/scene.ts';
import type { TrailProjection } from '../types/reading.ts';

function same<T extends object>(old: T[], next: T[]): boolean {
  return (
    old === next ||
    (old.length === next.length &&
      old.every((item, index) => {
        const other = next[index];
        const keys = Object.keys(item) as (keyof T)[];
        return (
          keys.length === Object.keys(other).length && keys.every((key) => item[key] === other[key])
        );
      }))
  );
}

/** Animation subscribers are confined to the overlay, never the article or dashboard. */
export function createSceneOverlay() {
  let snapshot: { labels: GalaxyLabel[]; trail: TrailProjection } = {
    labels: [],
    trail: { nodes: [], edges: [] },
  };
  const listeners = new Set<() => void>();
  const publish = (next: typeof snapshot) => {
    snapshot = next;
    listeners.forEach((listener) => listener());
  };
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setLabels(labels: GalaxyLabel[]) {
      if (!same(snapshot.labels, labels)) publish({ ...snapshot, labels });
    },
    setTrail(trail: TrailProjection) {
      const old = snapshot.trail;
      if (
        !same(old.nodes, trail.nodes) ||
        !same(old.edges, trail.edges) ||
        old.segments !== trail.segments
      )
        publish({ ...snapshot, trail });
    },
    clear() {
      publish({ labels: [], trail: { nodes: [], edges: [] } });
    },
  };
}
