import type { DocumentState } from './document-state.ts';
import type { LibraryActivity } from './types/library.ts';
import { documentTime } from './document-dates.ts';

/** Most recently changed to reading first; never infer progress time from content dates. */
export function readingDocuments<
  T extends {
    id: string;
    state?: DocumentState | null;
    stateChangedAt?: string | null;
  },
>(documents: T[], activity?: LibraryActivity): T[] {
  const history = new Map<string, number>();
  for (const event of activity?.events ?? []) {
    if (event.kind !== 'state-changed' || event.to !== 'reading' || !event.docId) continue;
    const time = documentTime(event.time);
    if (Number.isFinite(time) && time > (history.get(event.docId) ?? -Infinity))
      history.set(event.docId, time);
  }
  const time = (doc: T) => {
    const saved = documentTime(doc.stateChangedAt);
    return Number.isFinite(saved) ? saved : (history.get(doc.id) ?? -Infinity);
  };
  return documents
    .filter((doc) => doc.state === 'reading')
    .sort((a, b) => time(b) - time(a) || a.id.localeCompare(b.id));
}
