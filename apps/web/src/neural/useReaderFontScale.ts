import { useEffect, useState } from 'react';

export const readerFontScales = [85, 100, 115, 130, 150];
const storageKey = `horizon:reader-font-scale:v1:${globalThis.location?.pathname || '/'}`;

export function useReaderFontScale() {
  const [scale, setScale] = useState(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
      return typeof saved === 'number' && readerFontScales.includes(saved) ? saved : 100;
    } catch {
      return 100;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(scale));
    } catch {
      // Reading and adjustment remain available when browser storage is unavailable.
    }
  }, [scale]);
  return [scale, setScale] as const;
}
