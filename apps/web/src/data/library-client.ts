import type { Library } from '../types/library.ts';
import { parseLibrary } from './library-schema.ts';
import { record } from './validation.ts';

export const staticPages = typeof __STATIC_PAGES__ !== 'undefined' && __STATIC_PAGES__;
export const localEditing =
  !staticPages &&
  location.protocol === 'http:' &&
  ['localhost', '127.0.0.1'].includes(location.hostname);

export async function fetchLibrary(signal?: AbortSignal): Promise<Library> {
  const response = await fetch(
    staticPages ? import.meta.env.BASE_URL + 'library.json' : '/api/library',
    { signal },
  );
  if (!response.ok) throw Error('无法读取文档');
  return parseLibrary(await response.json());
}

export async function updateDocumentState(
  id: string,
  state: import('../document-state.ts').DocumentState,
  version: string,
): Promise<Library> {
  const response = await fetch('/api/documents/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, state, version }),
  });
  const next: unknown = await response.json();
  if (!response.ok)
    throw Error(record(next) && typeof next.error === 'string' ? next.error : '状态保存失败');
  return parseLibrary(next);
}
