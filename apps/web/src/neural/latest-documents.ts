import type { ReaderNode } from '../types/graph.ts';
import type { ReadingTrail } from '../types/reading.ts';
import { documentTime } from '../document-dates.ts';

// Filesystem time is a fallback, not a replacement for authored metadata.
export function latestDocuments(documents: ReaderNode[]) {
  return documents
    .map((doc) => {
      const date = [doc.updated, doc.created, doc.modified].find((value) =>
        Number.isFinite(documentTime(value)),
      );
      const modified = documentTime(doc.modified);
      return {
        id: doc.id,
        time: documentTime(date),
        tieTime: date?.length === 10 && Number.isFinite(modified) ? modified : 0,
      };
    })
    .filter((doc) => Number.isFinite(doc.time))
    .sort((a, b) => b.time - a.time || b.tieTime - a.tieTime || a.id.localeCompare(b.id))
    .slice(0, 10)
    .map(({ id, time }) => ({ id, time }));
}

// Reuse the scene's document-set focus without any route or numbered overlay.
export function documentHighlight(latest: { id: string }[]): ReadingTrail {
  return { nodes: latest.map((doc) => ({ id: doc.id, steps: [] })), edges: [], segments: [] };
}
