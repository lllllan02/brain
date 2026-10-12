import type { Library } from '../types/library.ts';
import type { ReaderGraph, ReaderNode, ReaderLink, ReaderDocumentNode } from '../types/graph.ts';
import { GRAPH_COLORS } from './theme.ts';

export function isDocumentNode(node: ReaderNode | null | undefined): node is ReaderDocumentNode {
  return node?.nodeType === 'document';
}

// Every topic comes from the single category property; tags do not determine groups.
const topicId = (category: string) => 'topic:' + encodeURIComponent(category);
const uncategorizedId = 'topic:uncategorized:';
export const moduleOf = (
  graph: ReaderGraph,
  node: ReaderNode | null | undefined,
  preferred?: string | null,
) =>
  graph.modules.find((m) => m.id === preferred && node?.modules?.includes(m.id)) ||
  graph.modules.find((m) => m.id === node?.module) ||
  null;
export function buildGraph(library: Library): ReaderGraph {
  const topics = new Map<string, string>();
  const memberships = new Map<string, string[]>();
  for (const doc of library.documents) {
    const category = (doc.category || '').trim();
    const id = category ? topicId(category) : uncategorizedId;
    topics.set(id, category || '未分类');
    const ids = [id];
    memberships.set(doc.id, ids);
  }
  const modules = [...topics]
    .sort((a, b) => a[1].localeCompare(b[1], 'zh-CN'))
    .map(([id, title], i, all) => {
      const hue = Math.floor(rng(id)() * 360);
      return {
        id,
        title,
        en: '',
        kind: id,
        folder: 'folder:' + id,
        angle: -90 + (i * 360) / all.length,
        icon: 'tag',
        color: hslHex(hue, 0.55, 0.8),
        filter: `hue-rotate(${hue}deg) saturate(1)`,
        flip: i % 2 ? -1 : 1,
      };
    });
  const styles = Object.fromEntries(
    modules.map((m) => [m.id, { color: m.color, filter: m.filter, flip: m.flip }]),
  );
  const kinds = {
    core: { label: '知识宇宙', en: 'Cosmos', color: GRAPH_COLORS.core },
    folder: { label: '主题', en: 'Topic', color: GRAPH_COLORS.folder },
    ...Object.fromEntries(
      modules.map((m) => [m.kind, { label: m.title, en: m.en, color: m.color }]),
    ),
  };
  const nodes: ReaderNode[] = [
    { id: 'core', kind: 'core', nodeType: 'core', title: '知识宇宙', tags: [] },
    ...modules.map((m) => ({
      id: m.folder,
      title: m.title,
      angle: m.angle,
      kind: 'folder',
      nodeType: 'folder' as const,
      tags: [],
    })),
  ];
  for (const doc of library.documents) {
    const ids = memberships.get(doc.id)!,
      module = modules.find((m) => m.id === ids[0])!;
    nodes.push({
      ...doc,
      nodeType: 'document',
      kind: module.kind,
      module: module.id,
      modules: ids,
      folder: module.folder,
      text: doc.title + ' ' + doc.body,
      short: doc.title,
    });
  }
  const index = new Map(nodes.map((n) => [n.id, n])),
    edgeMap = new Map<string, Omit<ReaderLink, 's' | 't' | 'both'>>();
  const link = (s: string, t: string, kind: string) => {
    if (s === t || !index.has(s) || !index.has(t)) return;
    const [a, b] = s < t ? [s, t] : [t, s];
    const key = JSON.stringify([a, b, kind]);
    const e = edgeMap.get(key) || { a, b, kind, ab: 0, ba: 0, w: 1 };
    if (s === a) e.ab++;
    else e.ba++;
    edgeMap.set(key, e);
  };
  for (const m of modules) {
    link('core', m.folder, 'contain');
    for (const n of nodes.filter((n) => n.modules?.includes(m.id))) link(m.folder, n.id, 'contain');
  }
  for (const doc of library.documents)
    for (const ref of doc.references) link(doc.id, ref.id, 'wiki');
  const links = [...edgeMap.values()].map((e) => ({
    ...e,
    both: e.ab > 0 && e.ba > 0,
    s: e.ab ? e.a : e.b,
    t: e.ab ? e.b : e.a,
  }));
  for (const n of nodes) {
    n.in = 0;
    n.out = 0;
    n.deg = 0;
    n.mutual = 0;
  }
  for (const l of links) {
    if (l.kind === 'contain') continue;
    const a = index.get(l.a)!,
      b = index.get(l.b)!;
    a.deg!++;
    b.deg!++;
    if (l.both) {
      a.mutual!++;
      b.mutual!++;
      a.in!++;
      b.in!++;
      a.out!++;
      b.out!++;
    } else {
      index.get(l.s)!.out!++;
      index.get(l.t)!.in!++;
    }
  }
  return {
    nodes,
    links,
    index,
    modules,
    kinds,
    styles,
    activity: library.activity,
    public: Boolean(library.public),
  };
}
function hslHex(h: number, s: number, l: number) {
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
      .toString(16)
      .padStart(2, '0');
  };
  return '#' + channel(0) + channel(8) + channel(4);
}
function rng(seed: string) {
  let s = 0;
  for (const c of seed) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}
