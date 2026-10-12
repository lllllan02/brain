import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { ReaderNode } from '../types/graph.ts';
import { createLibraryStore } from '../data/library-store.ts';
import {
  staticPages,
  localEditing,
  fetchLibrary,
  moveLibraryDocument,
} from '../data/library-client.ts';

export function useLibrary() {
  const [store] = useState(() =>
    createLibraryStore({ fetch: fetchLibrary, move: moveLibraryDocument }),
  );
  const { library, error, moveState, revision } = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
  );
  useEffect(() => {
    store.start();
    const timer = staticPages
      ? null
      : setInterval(() => {
          if (!document.hidden) void store.refresh();
        }, 4000);
    return () => {
      store.stop();
      if (timer !== null) clearInterval(timer);
    };
  }, [store]);
  useEffect(() => {
    if (moveState.status === 'idle' || moveState.status === 'pending') return;
    const timer = setTimeout(store.clearMove, moveState.status === 'error' ? 4500 : 2400);
    return () => clearTimeout(timer);
  }, [store, moveState]);
  const move = useCallback(
    async (doc: ReaderNode, collection: string) => {
      if (localEditing) await store.move(doc.id, collection);
    },
    [store],
  );
  return {
    library,
    error,
    moveState,
    collectionAction: localEditing ? { ...moveState, move } : null,
    revision: { current: revision },
  };
}
