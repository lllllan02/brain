import type { ActivityEvent } from '../types/library.ts';
import { documentTime } from '../document-dates.ts';
export const ACTIVITY_KINDS = {
  created: '新增文档',
  updated: '更新文档',
  moved: '目录迁移',
  'image-created': '新增配图',
  'image-updated': '更新配图',
  'image-format': '新增图片格式',
};
export function activityDay(time: string | null | undefined) {
  if (!time || !Number.isFinite(documentTime(time))) return null;
  if (time.length === 10) return time;
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(time));
  return ['year', 'month', 'day']
    .map((type) => parts.find((p) => p.type === type)!.value)
    .join('-');
}
export const shiftDay = (day: string, offset: number) =>
  new Date(Date.parse(day + 'T00:00:00Z') + offset * 86400000).toISOString().slice(0, 10);
export function periodStart(today: string, period: string) {
  if (period === 'month') return today.slice(0, 7) + '-01';
  if (period === 'week')
    return shiftDay(today, -((new Date(today + 'T00:00:00Z').getUTCDay() + 6) % 7));
  return today;
}
export function filterActivity(events: ActivityEvent[], collection = 'all', kind = 'all') {
  return events.filter(
    (e) =>
      (collection === 'all' || e.collections.includes(collection)) &&
      (kind === 'all' || e.kind === kind),
  );
}
// Daily activity measures affected items, not save frequency. Migration directions remain distinct in the detail list.
export function dailyItems(events: ActivityEvent[]) {
  const days = new Map<string, Set<string>>();
  for (const event of events) {
    const day = activityDay(event.time);
    if (!day) continue;
    if (!days.has(day)) days.set(day, new Set());
    days.get(day)!.add(event.entity);
  }
  return new Map([...days].map(([day, items]) => [day, items.size]));
}
export function dayDetails(events: ActivityEvent[], day: string) {
  const eventTime = (event: ActivityEvent) =>
    documentTime(event.time.length === 10 ? event.time + 'T00:00:00+08:00' : event.time);
  const result = new Map<string, ActivityEvent & { files: string[] }>();
  for (const e of events)
    if (activityDay(e.time) === day) {
      const key = JSON.stringify([e.entity, e.kind, e.from, e.to]);
      const old = result.get(key);
      if (!old) result.set(key, { ...e, files: [...(e.files || [])] });
      else {
        const latest = eventTime(e) >= eventTime(old) ? e : old;
        result.set(key, {
          ...latest,
          collections: [...new Set([...old.collections, ...e.collections])],
          files: [...new Set([...old.files, ...(e.files || [])])],
        });
      }
    }
  return [...result.values()].sort((a, b) => eventTime(b) - eventTime(a));
}
export function yearCells(year: string | number) {
  const first = `${year}-01-01`,
    last = `${year}-12-31`;
  const start = shiftDay(first, -((new Date(first + 'T00:00:00Z').getUTCDay() + 6) % 7));
  const end = shiftDay(last, 6 - ((new Date(last + 'T00:00:00Z').getUTCDay() + 6) % 7));
  const days = [];
  for (let day = start; day <= end; day = shiftDay(day, 1)) days.push(day);
  return days;
}
export function summaryCounts(events: ActivityEvent[], start: string, end: string) {
  const selected = events.filter(
    (e) => activityDay(e.time)! >= start && activityDay(e.time)! <= end,
  );
  const count = (predicate: (event: ActivityEvent) => boolean) =>
    new Set(selected.filter(predicate).map((e) => e.entity)).size;
  return {
    created: count((e) => e.kind === 'created'),
    updated: count((e) => e.kind === 'updated'),
    learned: count((e) => e.kind === 'moved' && e.to === 'notes'),
    relearn: count((e) => e.kind === 'moved' && e.to === 'inbox'),
    images: count((e) => e.kind === 'image-created'),
    formats: count((e) => e.kind === 'image-format'),
    imageUpdates: count((e) => e.kind === 'image-updated'),
    moved: count((e) => e.kind === 'moved'),
  };
}
