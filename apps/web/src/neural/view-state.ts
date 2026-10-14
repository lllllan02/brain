import type { Guard } from '../data/validation.ts';
import {
  record,
  string,
  array,
  nullable,
  object,
  boolean,
  number,
  optional,
} from '../data/validation.ts';
import type { Focus } from '../types/graph.ts';
import type { ReadingEntry } from '../types/reading.ts';
import type { Cluster, ReaderCluster } from '../types/reading.ts';
// Tab-local UI preferences only. Document contents always come from the library.
export function readViewState<T>(
  key: string,
  fallback: T,
  valid: Guard<T>,
  storage?: Pick<Storage, 'getItem'>,
  path = globalThis.location?.pathname || '/',
): T {
  try {
    const value: unknown = JSON.parse(
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

export const validSize = (value: unknown): value is { width: number; height: number } =>
  record(value) &&
  number(value.width) &&
  value.width >= 320 &&
  number(value.height) &&
  value.height >= 240;
const validDirection = (value: unknown) =>
  value === undefined || value === 'incoming' || value === 'outgoing' || value === 'suggested';
const validClusterValue = (value: unknown): value is Cluster =>
  record(value) &&
  validDirection(value.direction) &&
  ['category', 'tag', 'document'].every((key) => value[key] === undefined || string(value[key])) &&
  ['recent', 'latest', 'queue'].every(
    (key) => value[key] === undefined || array(object({ id: string }))(value[key]),
  ) &&
  (value.pinnedIds === undefined || array(string)(value.pinnedIds));
const hasSource = (value: Cluster) =>
  value.category !== undefined || value.tag !== undefined || value.document !== undefined;
export const validCluster = (value: unknown): value is ReaderCluster | null =>
  value === null ||
  (record(value) &&
    string(value.owner) &&
    (value.value === null || (validClusterValue(value.value) && hasSource(value.value))));
export const validPinnedList = (value: unknown): value is Cluster | null =>
  value === null ||
  (validClusterValue(value) &&
    array(string)(value.pinnedIds) &&
    (hasSource(value) || value.recent !== undefined || value.latest !== undefined));
export const validFocus = nullable(object<Focus>({ sel: nullable(string), mod: nullable(string) }));
export const validReadingEntry = object<ReadingEntry>({
  key: string,
  url: string,
  id: nullable(string),
  scroll: nullable(number),
  connected: optional(boolean),
});
export const validReadingSession = object<{ entries: ReadingEntry[] }>({
  entries: array(validReadingEntry),
});
