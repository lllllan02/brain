import { stateChangeTimestamp } from '../document-dates.ts';
import type { DocumentState } from '../document-state.ts';
import type { Library, StateUpdate } from '../types/library.ts';

type LoadState =
  | { status: 'loading'; library: null; error: '' }
  | { status: 'error'; library: null; error: string }
  | { status: 'ready'; library: Library; error: string };
export type LibrarySnapshot = LoadState & {
  updateState: StateUpdate;
  revision: number;
};
interface Transport {
  fetch(signal: AbortSignal): Promise<Library>;
  setState(id: string, state: DocumentState, version: string): Promise<Library>;
}
const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** One owner for requests: stale reads and completed writes cannot replace newer state. */
export function createLibraryStore(transport: Transport) {
  let snapshot: LibrarySnapshot = {
    status: 'loading',
    library: null,
    error: '',
    updateState: { status: 'idle', pending: false },
    revision: 0,
  };
  const listeners = new Set<() => void>();
  let active = false,
    generation = 0,
    revision = 0;
  let request: AbortController | null = null;
  const publish = (next: LibrarySnapshot) => {
    if (
      Object.keys(next).every(
        (key) => next[key as keyof LibrarySnapshot] === snapshot[key as keyof LibrarySnapshot],
      )
    )
      return;
    snapshot = next;
    listeners.forEach((listener) => listener());
  };
  const invalidate = () => {
    revision++;
    request?.abort();
    request = null;
  };
  const refresh = async () => {
    if (!active || request || snapshot.updateState.pending) return;
    const controller = new AbortController();
    request = controller;
    const ticket = revision,
      epoch = generation;
    try {
      const next = await transport.fetch(controller.signal);
      if (!active || epoch !== generation || ticket !== revision) return;
      const old = snapshot.library;
      if (old === next && snapshot.status === 'ready' && !snapshot.error) return;
      const unchanged =
        old?.version === next.version &&
        old.activity?.version === next.activity?.version &&
        JSON.stringify(old.activity) === JSON.stringify(next.activity);
      const previous = new Map(unchanged ? [] : old?.documents.map((doc) => [doc.id, doc]));
      const library = !old
        ? next
        : unchanged
          ? old
          : {
              ...next,
              documents: next.documents.map((doc) => {
                const existing = previous.get(doc.id);
                return existing && JSON.stringify(existing) === JSON.stringify(doc)
                  ? existing
                  : doc;
              }),
            };
      publish({ ...snapshot, status: 'ready', library, error: '' });
    } catch (error) {
      if (!active || epoch !== generation || ticket !== revision || controller.signal.aborted)
        return;
      publish(
        snapshot.library
          ? { ...snapshot, status: 'ready', library: snapshot.library, error: message(error) }
          : { ...snapshot, status: 'error', library: null, error: message(error) },
      );
    } finally {
      if (request === controller) request = null;
    }
  };
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    start() {
      active = true;
      generation++;
      // StrictMode may reconnect while a previous write is still finishing.
      if (snapshot.updateState.pending)
        publish({ ...snapshot, updateState: { status: 'idle', pending: false } });
      void refresh();
    },
    stop() {
      active = false;
      generation++;
      invalidate();
    },
    refresh,
    clearUpdate() {
      if (!snapshot.updateState.pending)
        publish({ ...snapshot, updateState: { status: 'idle', pending: false } });
    },
    async setState(id: string, state: DocumentState) {
      if (!active || !snapshot.library || snapshot.updateState.pending) return;
      const previousLibrary = snapshot.library;
      const version = previousLibrary.version,
        epoch = generation;
      invalidate();
      const optimistic = {
        ...previousLibrary,
        documents: previousLibrary.documents.map((doc) =>
          doc.id === id
            ? {
                ...doc,
                state,
                stateChangedAt: doc.state === state ? doc.stateChangedAt : stateChangeTimestamp(),
              }
            : doc,
        ),
      };
      publish({
        ...snapshot,
        library: optimistic,
        revision,
        updateState: { status: 'pending', pending: true, id },
      });
      try {
        const library = await transport.setState(id, state, version);
        if (!active || epoch !== generation) return;
        publish({
          status: 'ready',
          library,
          error: '',
          revision: ++revision,
          updateState: { status: 'success', pending: false, id, state },
        });
      } catch (error) {
        if (!active || epoch !== generation) return;
        publish({
          ...snapshot,
          revision: ++revision,
          library: previousLibrary,
          updateState: { status: 'error', pending: false, id, error: message(error) },
        });
      }
    },
  };
}
