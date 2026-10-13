import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { ReaderNode } from '../types/graph.ts';
import { createLibraryStore } from '../data/library-store.ts';
import {
  staticPages,
  localEditing,
  fetchLibrary,
  updateDocumentState,
} from '../data/library-client.ts';

export function useLibrary() {
  const [store] = useState(() =>
    createLibraryStore({ fetch: fetchLibrary, setState: updateDocumentState }),
  );
  const { library, error, updateState, revision } = useSyncExternalStore(
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
    if (updateState.status === 'idle' || updateState.status === 'pending') return;
    const timer = setTimeout(store.clearUpdate, updateState.status === 'error' ? 4500 : 2400);
    return () => clearTimeout(timer);
  }, [store, updateState]);
  const setState = useCallback(
    async (doc: ReaderNode, state: import('../document-state.ts').DocumentState) => {
      if (localEditing) await store.setState(doc.id, state);
    },
    [store],
  );
  return {
    library,
    error,
    updateState,
    stateAction: localEditing ? { ...updateState, setState } : null,
    revision: { current: revision },
  };
}
