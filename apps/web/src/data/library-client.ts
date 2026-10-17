import type { Library } from '../types/library.ts';
import { parseLibrary } from './library-schema.ts';
import { record } from './validation.ts';
import { migrateReadingQueue } from './migrate-reading-queue.ts';

export const staticPages = typeof __STATIC_PAGES__ !== 'undefined' && __STATIC_PAGES__;
export const localEditing =
  !staticPages &&
  location.protocol === 'http:' &&
  ['localhost', '127.0.0.1'].includes(location.hostname);

let knownLibrary: Library | undefined;
let cached: { etag: string; library: Library } | undefined;

async function migrateLegacyQueue(library: Library, signal?: AbortSignal) {
  if (!localEditing) return library;
  let storage: Storage | undefined;
  try {
    storage = globalThis.localStorage;
  } catch {
    return library;
  }
  return migrateReadingQueue(
    library,
    updateDocumentState,
    storage,
    location.pathname || '/',
    signal,
  );
}

export async function fetchLibrary(signal?: AbortSignal): Promise<Library> {
  const response = await fetch(
    staticPages ? import.meta.env.BASE_URL + 'library.json' : '/api/library',
    {
      signal,
      // Handle validation ourselves: the HTTP cache otherwise returns the old
      // JSON body as a 200 and we parse/validate the entire library every poll.
      ...(cached ? { headers: { 'If-None-Match': cached.etag }, cache: 'no-store' as const } : {}),
    },
  );
  if (response.status === 304 && cached) {
    const previous = cached.library;
    const library = await migrateLegacyQueue(previous, signal);
    signal?.throwIfAborted();
    if (library !== previous) cached = undefined;
    return library;
  }
  if (!response.ok) throw Error('无法读取文档');
  const library = parseLibrary(await response.json());
  signal?.throwIfAborted();
  knownLibrary = library;
  const etag = response.headers?.get('ETag');
  const migrated = await migrateLegacyQueue(library, signal);
  signal?.throwIfAborted();
  cached = etag && migrated === library ? { etag, library } : undefined;
  return migrated;
}

export async function updateDocumentState(
  id: string,
  state: import('../document-state.ts').DocumentState,
  version: string,
): Promise<Library> {
  const response = await fetch('/api/documents/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id,
      state,
      version,
      ...(knownLibrary?.version === version ? { incremental: true } : {}),
    }),
  });
  const next: unknown = await response.json();
  if (!response.ok)
    throw Error(record(next) && typeof next.error === 'string' ? next.error : '状态保存失败');
  let library: Library;
  if (record(next) && next.kind === 'state-update') {
    if (!knownLibrary || next.baseVersion !== version || knownLibrary.version !== version)
      throw Error('状态响应版本不匹配，请同步后重试。');
    const patch = parseLibrary(next);
    const changed = new Map(patch.documents.map((doc) => [doc.id, doc]));
    const available = new Set(knownLibrary.documents.map((doc) => doc.id));
    if (patch.documents.some((doc) => !available.has(doc.id)))
      throw Error('状态响应包含未知文档。');
    library = {
      ...knownLibrary,
      version: patch.version,
      activity: patch.activity,
      documents: knownLibrary.documents.map((doc) => changed.get(doc.id) ?? doc),
    };
  } else library = parseLibrary(next);
  knownLibrary = library;
  const etag = response.headers?.get('ETag');
  cached = etag ? { etag, library } : undefined;
  return library;
}
