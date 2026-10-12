import { useCallback, useEffect, useRef, useState } from 'react';
import type { Library, MoveState } from '../types/library.ts';
import type { ReaderNode } from '../types/graph.ts';
import {
  staticPages,
  localEditing,
  fetchLibrary,
  moveLibraryDocument,
} from '../data/library-client.ts';

// Keep polling, moves and their revision guard in one lifecycle.
export function useLibrary() {
  const [library, setLibrary] = useState<Library | null>(null),
    [error, setError] = useState('');
  const revision = useRef(0),
    busy = useRef(false);
  const [moveState, setMoveState] = useState<MoveState>({ pending: false });
  useEffect(() => {
    if (moveState.pending || !moveState.id) return;
    const timer = setTimeout(() => setMoveState({ pending: false }), moveState.error ? 4500 : 2400);
    return () => clearTimeout(timer);
  }, [moveState]);
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (busy.current) return;
      const ticket = revision.current;
      try {
        const next = await fetchLibrary();
        if (active && ticket === revision.current && !busy.current)
          setLibrary((old) =>
            old?.version === next.version &&
            JSON.stringify(old?.activity) === JSON.stringify(next.activity)
              ? old
              : next,
          );
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : String(e));
      }
    };
    load();
    const timer = staticPages
      ? null
      : setInterval(() => {
          if (!document.hidden) load();
        }, 4000);
    return () => {
      active = false;
      if (timer !== null) clearInterval(timer);
    };
  }, []);
  const move = useCallback(
    async (doc: ReaderNode, collection: string) => {
      if (!localEditing || busy.current) return;
      busy.current = true;
      revision.current++;
      setMoveState({ id: doc.id, pending: true });
      try {
        const next = await moveLibraryDocument(doc.id, collection, library!.version);
        setLibrary(next);
        setMoveState({ id: doc.id, pending: false, collection });
      } catch (error) {
        setMoveState({
          id: doc.id,
          pending: false,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        busy.current = false;
        revision.current++;
      }
    },
    [library],
  );
  const collectionAction = localEditing ? { ...moveState, move } : null;
  return { library, error, moveState, collectionAction, revision };
}
