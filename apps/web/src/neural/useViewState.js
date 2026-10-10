import {useLayoutEffect, useState} from 'react';
import {readViewState, writeViewState} from './view-state';

export function useViewState(key, fallback, valid = value => typeof value === typeof fallback) {
  const [value, setValue] = useState(() => readViewState(key, fallback, valid));
  useLayoutEffect(() => { writeViewState(key, value); }, [key, value]);
  return [value, setValue];
}
