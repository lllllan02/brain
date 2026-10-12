import { useLayoutEffect, useState } from 'react';
import { readViewState, writeViewState } from './view-state.ts';

export function useViewState<T>(
  key: string,
  fallback: T,
  valid: (value: T) => boolean = (value) => typeof value === typeof fallback,
) {
  const [value, setValue] = useState(() => readViewState(key, fallback, valid));
  useLayoutEffect(() => {
    writeViewState(key, value);
  }, [key, value]);
  return [value, setValue] as const;
}
