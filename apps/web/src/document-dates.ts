// Keep legacy day-only values readable; new timestamps include seconds and a zone.
export function documentTime(value: unknown) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)
  )
    return NaN;
  const day = value.slice(0, 10);
  const dayTime = Date.parse(day);
  if (!Number.isFinite(dayTime) || new Date(dayTime).toISOString().slice(0, 10) !== day) return NaN;
  return Date.parse(value);
}

// Progress ordering retains milliseconds so rapid changes within one second stay ordered.
export function stateChangeTimestamp(now = Date.now()) {
  return new Date(now + 8 * 60 * 60 * 1000).toISOString().replace('Z', '+08:00');
}
