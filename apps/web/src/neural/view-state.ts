import type { Cluster, ReaderCluster } from '../types/reading.ts';
// Tab-local UI preferences only. Document contents always come from the library.
export function readViewState<T>(
  key: string,
  fallback: T,
  valid: (value: T) => boolean,
  storage?: Pick<Storage, 'getItem'>,
  path = globalThis.location?.pathname || '/',
): T {
  try {
    const value = JSON.parse(
      (storage ?? globalThis.sessionStorage).getItem(`horizon:view:v1:${path}:${key}`) ?? 'null',
    );
    return valid(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function writeViewState(key: string, value: unknown) {
  try {
    sessionStorage.setItem(`horizon:view:v1:${location.pathname}:${key}`, JSON.stringify(value));
  } catch {
    /* Disabled or full storage must never prevent reading. */
  }
}

export const validSize = (value: { width: number; height: number } | null) =>
  !!value &&
  Number.isFinite(value.width) &&
  value.width >= 320 &&
  Number.isFinite(value.height) &&
  value.height >= 240;
export const validCluster = (value: ReaderCluster | null) =>
  value === null ||
  Boolean(
    value &&
    typeof value.owner === 'string' &&
    (value.value === null ||
      (value.value &&
        (typeof value.value.category === 'string' ||
          typeof value.value.tag === 'string' ||
          (typeof value.value.document === 'string' &&
            [undefined, 'incoming', 'outgoing'].includes(value.value.direction))))),
  );

export const validPinnedList = (value: Cluster | null) =>
  value === null ||
  Boolean(
    value &&
    Array.isArray(value.pinnedIds) &&
    value.pinnedIds.every((id) => typeof id === 'string') &&
    (validCluster({ owner: '', value }) ||
      [value.recent, value.latest].some(
        (items) =>
          Array.isArray(items) && items.every((item) => item && typeof item.id === 'string'),
      )),
  );
