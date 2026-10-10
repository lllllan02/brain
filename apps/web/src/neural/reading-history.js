export const HISTORY_LIMIT = 50;

export function trailPlayback(segments, previousKeys) {
  if (previousKeys === null) return {play: segments, settled: []};
  const latest = segments.at(-1);
  if (!latest || previousKeys.includes(latest.key)) return {play: [], settled: segments};
  return {play: [latest], settled: segments.slice(0, -1)};
}

export function readingDirection(event) {
  if (event.defaultPrevented || event.repeat || event.isComposing || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return 0;
  if (event.target?.isContentEditable || event.target?.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="slider"],[role="textbox"],[role="combobox"],[role="listbox"],[role="menu"],[role="tree"],[role="tablist"],[role="grid"],.reader-resize-handle,.table-wrap,pre,.diagram-block')) return 0;
  return event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
}

export function parseReadingRoute(hash) {
  const parts = hash.replace(/^#\//, '').split('/');
  try {
    return {id: parts[0] === 'doc' ? decodeURIComponent(parts[1] || '') : null,
      module: parts[0] === 'module' ? parts[1] : null,
      anchor: parts[0] === 'doc' ? decodeURIComponent(parts[2] || '') : ''};
  } catch { return {id: null, module: null, anchor: ''}; }
}

export function readVisits(raw) {
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(v => v && typeof v.key === 'string' && typeof v.id === 'string'
      && (v.from === null || typeof v.from === 'string') && Number.isFinite(v.time)).slice(-HISTORY_LIMIT) : [];
  } catch { return []; }
}

export function recordVisit(visits, visit) {
  // Anchors, library refreshes and selecting the already-open star are not new reads.
  if (visit.id === visit.from) return visits;
  return [...visits, visit].slice(-HISTORY_LIMIT);
}

// Normalize saved history and show the most recently read documents first.
export function recentDocuments(visits) {
  return [...new Map(visits.map(visit => [visit.id, visit])).values()]
    .sort((a, b) => b.time - a.time).slice(0, HISTORY_LIMIT);
}

export function rememberDocument(recent, visit) {
  // Put this visit first even when two reads share the same timestamp.
  return recentDocuments([visit, ...recent.filter(item => item.id !== visit.id)]);
}

export function adjacentDocument(entries, cursor, direction, available) {
  const current = entries[cursor]?.id;
  for (let i = cursor + direction; i >= 0 && i < entries.length; i += direction) {
    if (entries[i].id && entries[i].id !== current && available.has(entries[i].id)) return i;
  }
  return -1;
}

export function readingTrail(visits, available, recent = recentDocuments(visits)) {
  const nodes = new Map(recent.filter(visit => available.has(visit.id)).map(visit => [visit.id,
    {id: visit.id, steps: [recent.indexOf(visit) + 1]}]));
  const edges = [], segments = [], seenEdges = new Set();
  visits.forEach((visit, index) => {
    if (!nodes.has(visit.id)) return;
    const previous = visits[index - 1];
    // Never invent a connection across a new session, a cleared list or a removed note.
    const edgeKey = JSON.stringify([visit.from, visit.id]);
    if (previous && visit.from === previous.id && previous.id !== visit.id && nodes.has(previous.id)) {
      const edge = {from: previous.id, to: visit.id, step: index + 1};
      segments.push({...edge, key: visit.key});
      if (!seenEdges.has(edgeKey)) {edges.push(edge); seenEdges.add(edgeKey);}
    }
  });
  return {nodes: [...nodes.values()], edges, segments};
}
