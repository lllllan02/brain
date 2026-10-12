import {useEffect, useState} from 'react';

const storageKey = `horizon:reading-queue:v1:${globalThis.location?.pathname || '/'}`;

function readQueue() {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey));
    return Array.isArray(value) ? [...new Set(value.filter(id => typeof id === 'string' && id))].map(id => ({id})) : [];
  } catch { return []; }
}

export function useReadingQueue() {
  const [items, setItems] = useState(readQueue);
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(items.map(item => item.id))); }
    catch { /* Unavailable storage must not interrupt the current reading session. */ }
  }, [items]);
  return {
    items,
    has: id => items.some(item => item.id === id),
    toggle: id => setItems(previous => previous.some(item => item.id === id)
      ? previous.filter(item => item.id !== id) : [...previous, {id}]),
  };
}
