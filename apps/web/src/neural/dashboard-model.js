import {activityDay, dailyItems, shiftDay, summaryCounts} from './activity-model.js';

// Counts describe known events, never reconstructed inventory or learning scores.
export function dashboardPulse(activity, documents, today, days) {
  const start = shiftDay(today, 1 - days);
  const events = (activity?.events || []).filter(e => {
    const day = activityDay(e.time);
    return day && day >= start && day <= today;
  });
  const created = dailyItems(events.filter(e => e.kind === 'created'));
  const updated = dailyItems(events.filter(e => e.kind === 'updated'));
  const series = Array.from({length: days}, (_, i) => {
    const day = shiftDay(start, i);
    return {day, created: created.get(day) || 0, updated: updated.get(day) || 0};
  });
  const index = new Map(documents.map(doc => [doc.id, doc]));
  const topics = new Map();
  for (const e of events) {
    const doc = index.get(e.docId);
    if (!doc || !['created', 'updated', 'moved'].includes(e.kind)) continue;
    const name = doc.category?.trim() || '未分类';
    if (!topics.has(name)) topics.set(name, new Set());
    topics.get(name).add(doc.id);
  }
  const observed = activityDay(activity?.startedAt);
  return {start, series, counts: summaryCounts(events, start, today),
    activeDays: new Set(events.map(e => activityDay(e.time))).size,
    complete: Boolean(observed && observed <= start && !activity?.error),
    topics: [...topics].map(([name, ids]) => ({name, count: ids.size}))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN')).slice(0, 5)};
}
