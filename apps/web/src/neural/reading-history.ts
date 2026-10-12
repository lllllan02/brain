import type {
  ReadingEntry,
  Visit,
  ReadingTrail,
  TrailNode,
  TrailEdge,
  TrailSegment,
  Point,
} from '../types/reading.ts';
export const HISTORY_LIMIT = 50;

// The active browser branch, not the chronological list of all visits. Keep the
// latest anchor entry for each consecutive document so return restores its scroll.
export function activeReadingPath(
  entries: ReadingEntry[],
  cursor: number,
  available: Set<string>,
): ReadingEntry[] {
  const path: ReadingEntry[] = [];
  let interrupted = false;
  for (const entry of entries.slice(0, cursor + 1)) {
    if (!entry.id) {
      interrupted = true;
      continue;
    }
    if (!available.has(entry.id)) {
      interrupted = true;
      continue;
    }
    const previous = path.at(-1);
    if (previous?.id === entry.id)
      path[path.length - 1] = { ...entry, connected: previous.connected };
    else path.push({ ...entry, connected: Boolean(previous) && !interrupted });
    interrupted = false;
  }
  return path;
}

// Show only the current read and its two immediate predecessors in space.
export function activeReadingTrail(
  path: ReadingEntry[],
  hop: TrailSegment | null = null,
): ReadingTrail {
  const recent = path.slice(-3),
    nodes = new Map<string, TrailNode>(),
    edges = new Map<string, TrailEdge>();
  recent.forEach((entry, index) => {
    nodes.set(entry.id!, {
      id: entry.id!,
      key: entry.key,
      steps: [index + 1],
      weight: 0.6 + (0.4 * (index + 1)) / recent.length,
    });
    const previous = recent[index - 1];
    if (previous && entry.connected) {
      const edge = { from: previous.id!, to: entry.id! };
      edges.set(JSON.stringify([edge.from, edge.to]), edge);
    }
  });
  // A reverse hop may start outside the shortened branch, but only for its flight.
  if (hop && !nodes.has(hop.from))
    nodes.set(hop.from, { id: hop.from, steps: [], weight: 0.45, transient: true });
  return {
    live: true,
    nodes: [...nodes.values()],
    edges: [...edges.values()],
    segments: hop ? [hop] : [],
  };
}

export function trailPlayback(segments: TrailSegment[], previousKeys: string[] | null) {
  if (previousKeys === null) return { play: segments, settled: [] };
  const latest = segments.at(-1);
  if (!latest || previousKeys.includes(latest.key)) return { play: [], settled: segments };
  return { play: [latest], settled: segments.slice(0, -1) };
}

export function readingDirection(event: KeyboardEvent) {
  if (
    event.defaultPrevented ||
    event.repeat ||
    event.isComposing ||
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    event.shiftKey
  )
    return 0;
  if (
    (event.target as HTMLElement | null)?.isContentEditable ||
    (event.target as Element | null)?.closest(
      'input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="slider"],[role="textbox"],[role="combobox"],[role="listbox"],[role="menu"],[role="tree"],[role="tablist"],[role="grid"],.reader-resize-handle,.table-wrap,pre,.diagram-block',
    )
  )
    return 0;
  return event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
}

export function parseReadingRoute(hash: string) {
  const parts = hash.replace(/^#\//, '').split('/');
  try {
    return {
      id: parts[0] === 'doc' ? decodeURIComponent(parts[1] || '') : null,
      module: parts[0] === 'module' ? parts[1] : null,
      anchor: parts[0] === 'doc' ? decodeURIComponent(parts[2] || '') : '',
    };
  } catch {
    return { id: null, module: null, anchor: '' };
  }
}

export function readVisits(raw: string | null): Visit[] {
  try {
    const value = JSON.parse(raw ?? 'null');
    return Array.isArray(value)
      ? value
          .filter(
            (v) =>
              v &&
              typeof v.key === 'string' &&
              typeof v.id === 'string' &&
              (v.from === null || typeof v.from === 'string') &&
              Number.isFinite(v.time),
          )
          .slice(-HISTORY_LIMIT)
      : [];
  } catch {
    return [];
  }
}

export function recordVisit(visits: Visit[], visit: Visit) {
  // Anchors, library refreshes and selecting the already-open star are not new reads.
  if (visit.id === visit.from) return visits;
  return [...visits, visit].slice(-HISTORY_LIMIT);
}

// Normalize saved history and show the most recently read documents first.
export function recentDocuments(visits: Visit[]) {
  return [...new Map(visits.map((visit) => [visit.id, visit])).values()]
    .sort((a, b) => b.time - a.time)
    .slice(0, HISTORY_LIMIT);
}

export function rememberDocument(recent: Visit[], visit: Visit) {
  // Put this visit first even when two reads share the same timestamp.
  return recentDocuments([visit, ...recent.filter((item) => item.id !== visit.id)]);
}

export function adjacentDocument(
  entries: ReadingEntry[],
  cursor: number,
  direction: number,
  available: Set<string>,
) {
  const current = entries[cursor]?.id;
  for (let i = cursor + direction; i >= 0 && i < entries.length; i += direction) {
    if (entries[i].id && entries[i].id !== current && available.has(entries[i].id!)) return i;
  }
  return -1;
}

export function readingTrail(
  visits: Visit[],
  available: Set<string>,
  recent = recentDocuments(visits),
): ReadingTrail {
  const nodes = new Map(
    recent
      .filter((visit) => available.has(visit.id))
      .map((visit) => [visit.id, { id: visit.id, steps: [recent.indexOf(visit) + 1] }]),
  );
  const edges: TrailEdge[] = [],
    segments: TrailSegment[] = [],
    seenEdges = new Set<string>();
  visits.forEach((visit, index) => {
    if (!nodes.has(visit.id)) return;
    const previous = visits[index - 1];
    // Never invent a connection across a new session, a cleared list or a removed note.
    const edgeKey = JSON.stringify([visit.from, visit.id]);
    if (
      previous &&
      visit.from === previous.id &&
      previous.id !== visit.id &&
      nodes.has(previous.id)
    ) {
      const edge = { from: previous.id, to: visit.id, step: index + 1 };
      segments.push({ ...edge, key: visit.key });
      if (!seenEdges.has(edgeKey)) {
        edges.push(edge);
        seenEdges.add(edgeKey);
      }
    }
  });
  return { nodes: [...nodes.values()], edges, segments };
}

// Scale endpoint gaps with projected distance so zooming out never drops an edge.
export function trailPath(edge: TrailEdge, nodes: Map<string, Point>) {
  const a = nodes.get(edge.from),
    b = nodes.get(edge.to);
  if (!a || !b) return '';
  const dx = b.x - a.x,
    dy = b.y - a.y,
    length = Math.hypot(dx, dy);
  if (length < 0.01) return '';
  const ux = dx / length,
    uy = dy / length,
    bend = Math.min(38, length * 0.14);
  const start = Math.min(6, length * 0.12),
    end = Math.min(8, length * 0.16);
  return `M${a.x + ux * start},${a.y + uy * start} Q${(a.x + b.x) / 2 - uy * bend},${(a.y + b.y) / 2 + ux * bend} ${b.x - ux * end},${b.y - uy * end}`;
}

export function readingOrigin(
  previous: string | null,
  routeId: string | null,
  readableId: string | null,
) {
  // Closing the reader or browsing categories is still the same reading session.
  // A missing document, however, must not create a jump across unavailable content.
  return routeId === null ? previous : readableId;
}
