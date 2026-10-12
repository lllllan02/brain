import type { Library, MoveState } from '../types/library.ts';

type LoadState =
  | { status: 'loading'; library: null; error: '' }
  | { status: 'error'; library: null; error: string }
  | { status: 'ready'; library: Library; error: string };
export type LibrarySnapshot = LoadState & {
  moveState: MoveState;
  revision: number;
  pendingLibrary: Library | null;
};
interface Transport {
  fetch(signal: AbortSignal): Promise<Library>;
  move(id: string, collection: string, version: string): Promise<Library>;
}
const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** One owner for requests: stale reads and completed writes cannot replace newer state. */
export function createLibraryStore(transport: Transport) {
  let snapshot: LibrarySnapshot = {
    status: 'loading',
    library: null,
    error: '',
    moveState: { status: 'idle', pending: false },
    revision: 0,
    pendingLibrary: null,
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
    if (!active || request || snapshot.moveState.pending) return;
    const controller = new AbortController();
    request = controller;
    const ticket = revision,
      epoch = generation;
    try {
      const next = await transport.fetch(controller.signal);
      if (!active || epoch !== generation || ticket !== revision) return;
      const old = snapshot.library;
      const unchanged =
        old?.version === next.version &&
        old.activity?.version === next.activity?.version &&
        JSON.stringify(old.activity) === JSON.stringify(next.activity);
      const pending = snapshot.pendingLibrary;
      const pendingLibrary =
        !old || unchanged
          ? null
          : pending?.version === next.version &&
              JSON.stringify(pending.activity) === JSON.stringify(next.activity)
            ? pending
            : next;
      publish({ ...snapshot, status: 'ready', library: old ?? next, pendingLibrary, error: '' });
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
      if (snapshot.moveState.pending)
        publish({ ...snapshot, moveState: { status: 'idle', pending: false } });
      void refresh();
    },
    stop() {
      active = false;
      generation++;
      invalidate();
    },
    refresh,
    applyUpdate() {
      if (!active || !snapshot.pendingLibrary || snapshot.moveState.pending || snapshot.error)
        return;
      invalidate();
      publish({
        ...snapshot,
        status: 'ready',
        library: snapshot.pendingLibrary,
        pendingLibrary: null,
        revision,
      });
    },
    clearMove() {
      if (!snapshot.moveState.pending)
        publish({ ...snapshot, moveState: { status: 'idle', pending: false } });
    },
    async move(id: string, collection: string) {
      if (!active || !snapshot.library || snapshot.moveState.pending) return;
      const version = snapshot.library.version,
        epoch = generation;
      invalidate();
      publish({ ...snapshot, revision, moveState: { status: 'pending', pending: true, id } });
      try {
        const library = await transport.move(id, collection, version);
        if (!active || epoch !== generation) return;
        publish({
          status: 'ready',
          library,
          pendingLibrary: null,
          error: '',
          revision: ++revision,
          moveState: { status: 'success', pending: false, id, collection },
        });
      } catch (error) {
        if (!active || epoch !== generation) return;
        publish({
          ...snapshot,
          revision: ++revision,
          moveState: { status: 'error', pending: false, id, error: message(error) },
        });
      }
    },
  };
}
