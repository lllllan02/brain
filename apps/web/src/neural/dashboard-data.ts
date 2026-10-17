import type { ReaderDocumentNode, ReaderGraph } from '../types/graph.ts';
import type { DocumentState } from '../document-state.ts';
import type { ActivityEvent } from '../types/library.ts';
import { documentTime } from '../document-dates.ts';
import { activityDay, dailyItems, shiftDay } from './activity-model.ts';

export const DASHBOARD_STATES: DocumentState[] = ['reading', 'pending', 'organized'];
export const docHref = (id: string) => `#/doc/${encodeURIComponent(id)}`;
export const docState = (doc: ReaderDocumentNode) => doc.state || 'pending';
export const docDate = (doc: ReaderDocumentNode) => doc.updated || doc.created;
const dateValue = (doc: ReaderDocumentNode) => documentTime(docDate(doc)) || 0;
export const newestFirst = (a: ReaderDocumentNode, b: ReaderDocumentNode) =>
  dateValue(b) - dateValue(a) || a.title.localeCompare(b.title, 'zh-CN');
export function stateCounts(docs: ReaderDocumentNode[]) {
  return Object.fromEntries(
    DASHBOARD_STATES.map((state) => [state, docs.filter((d) => docState(d) === state).length]),
  ) as Record<DocumentState, number>;
}
export function dashboardData(graph: ReaderGraph) {
  const docs = graph.nodes.filter((n): n is ReaderDocumentNode => n.nodeType === 'document');
  return {
    docs,
    counts: stateCounts(docs),
    latest: [...docs].sort(newestFirst).find((d) => Number.isFinite(documentTime(docDate(d)))),
  };
}
export type DashboardData = ReturnType<typeof dashboardData>;
export function topicGroups(docs: ReaderDocumentNode[]) {
  const groups = new Map<string, ReaderDocumentNode[]>();
  for (const doc of docs) {
    const name = doc.category.trim() || '未分类';
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name)!.push(doc);
  }
  return [...groups]
    .map(([name, documents]) => ({ name, docs: documents, counts: stateCounts(documents) }))
    .sort((a, b) => b.docs.length - a.docs.length || a.name.localeCompare(b.name, 'zh-CN'));
}
// Daily bars count distinct affected objects, never visits, study time or save frequency.
export function recentActivity(events: ActivityEvent[], today: string, days = 14) {
  const start = shiftDay(today, 1 - days);
  const selected = events.filter((e) => {
    const day = activityDay(e.time);
    return day && day >= start && day <= today;
  });
  const counts = dailyItems(selected);
  return {
    start,
    series: Array.from({ length: days }, (_, i) => {
      const day = shiftDay(start, i);
      return { day, count: counts.get(day) || 0 };
    }),
    documents: new Set(selected.filter((e) => e.docId).map((e) => e.docId)).size,
  };
}
export function monthCells(month: string) {
  const first = `${month}-01`;
  const offset = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
  const next = new Date(`${first}T00:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const days = Math.round((next.getTime() - Date.parse(`${first}T00:00:00Z`)) / 86400000);
  return Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, i) =>
    shiftDay(first, i - offset),
  );
}
export function shiftMonth(month: string, offset: number) {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}
export function shortDate(value: string | null | undefined) {
  const day = activityDay(value);
  return day
    ? new Intl.DateTimeFormat('zh-CN', {
        month: 'numeric',
        day: 'numeric',
        timeZone: 'Asia/Shanghai',
      }).format(new Date(`${day}T00:00:00+08:00`))
    : '日期未填写';
}
