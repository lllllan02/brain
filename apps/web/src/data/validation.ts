/** Runtime boundaries accept unknown; application code receives validated values. */
export type Guard<T> = (value: unknown) => value is T;
export const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
export const string: Guard<string> = (value) => typeof value === 'string';
export const boolean: Guard<boolean> = (value) => typeof value === 'boolean';
export const number: Guard<number> = (value): value is number =>
  typeof value === 'number' && Number.isFinite(value);
export const optional =
  <T>(guard: Guard<T>): Guard<T | undefined> =>
  (value): value is T | undefined =>
    value === undefined || guard(value);
export const nullable =
  <T>(guard: Guard<T>): Guard<T | null> =>
  (value): value is T | null =>
    value === null || guard(value);
export const array =
  <T>(guard: Guard<T>): Guard<T[]> =>
  (value): value is T[] =>
    Array.isArray(value) && value.every(guard);
export const literal =
  <T extends string>(...values: T[]): Guard<T> =>
  (value): value is T =>
    typeof value === 'string' && values.some((item) => item === value);
export const object =
  <T>(shape: { [K in keyof T]-?: Guard<T[K]> }): Guard<T> =>
  (value): value is T =>
    record(value) &&
    Object.entries<Guard<unknown>>(shape).every(([key, guard]) => guard(value[key]));

export const dictionary =
  <T>(guard: Guard<T>): Guard<Record<string, T>> =>
  (value): value is Record<string, T> =>
    record(value) && Object.values(value).every(guard);
