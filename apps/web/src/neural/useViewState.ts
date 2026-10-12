import type { Guard } from '../data/validation.ts';
import { useLayoutEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { readViewState, writeViewState } from './view-state.ts';

type ViewState<T> = readonly [T, Dispatch<SetStateAction<T>>];
export function useViewState(key: string, fallback: string): ViewState<string>;
export function useViewState(key: string, fallback: boolean): ViewState<boolean>;
export function useViewState(key: string, fallback: number): ViewState<number>;
export function useViewState<T>(key: string, fallback: T, valid: Guard<T>): ViewState<T>;
export function useViewState<T>(
  key: string,
  fallback: T,
  valid: Guard<T> = (value): value is T =>
    ['string', 'boolean', 'number'].includes(typeof fallback) &&
    typeof value === typeof fallback &&
    (typeof value !== 'number' || Number.isFinite(value)),
) {
  const [value, setValue] = useState(() => readViewState(key, fallback, valid));
  useLayoutEffect(() => {
    writeViewState(key, value);
  }, [key, value]);
  return [value, setValue] as const;
}
