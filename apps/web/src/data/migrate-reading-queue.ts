import type { Library } from '../types/library.ts';
import type { DocumentState } from '../document-state.ts';

/** Consume the old browser queue only after the corresponding file state is saved. */
export async function migrateReadingQueue(
  library: Library,
  write: (id: string, state: DocumentState, version: string) => Promise<Library>,
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | undefined,
  pathname: string,
  signal?: AbortSignal,
): Promise<Library> {
  let current = library;
  if (!storage) return current;
  const key = `horizon:reading-queue:v1:${pathname}`;
  const read = () => {
    const value: unknown = JSON.parse(storage.getItem(key) ?? '[]');
    return Array.isArray(value) && value.every((id): id is string => typeof id === 'string')
      ? value
      : [];
  };
  try {
    for (const id of new Set(read())) {
      if (signal?.aborted) break;
      const doc = current.documents.find((doc) => doc.id === id);
      // Preserve unavailable documents so a later restore can still migrate them.
      if (!doc) continue;
      if (doc.state !== 'reading') current = await write(id, 'reading', current.version);
      if (current.documents.find((doc) => doc.id === id)?.state !== 'reading') break;
      // Re-read before removing an item to preserve additions from another browser tab.
      const remaining = read().filter((item) => item !== id);
      if (remaining.length) storage.setItem(key, JSON.stringify(remaining));
      else storage.removeItem(key);
    }
  } catch {
    // Keep unconfirmed IDs for the next poll; migration must never block reading.
  }
  return current;
}
