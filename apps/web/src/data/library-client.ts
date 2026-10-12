import type { Library } from '../types/library.ts';

export const staticPages = typeof __STATIC_PAGES__ !== 'undefined' && __STATIC_PAGES__;
export const localEditing =
  !staticPages &&
  location.protocol === 'http:' &&
  ['localhost', '127.0.0.1'].includes(location.hostname);

export async function fetchLibrary(): Promise<Library> {
  const response = await fetch(
    staticPages ? import.meta.env.BASE_URL + 'library.json' : '/api/library',
  );
  if (!response.ok) throw Error('无法读取文档');
  return response.json() as Promise<Library>;
}

export async function moveLibraryDocument(
  id: string,
  collection: string,
  version: string,
): Promise<Library> {
  const response = await fetch('/api/documents/move', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, collection, version }),
  });
  const next = (await response.json()) as Library & { error?: string };
  if (!response.ok) throw Error(next.error || '移动失败');
  return next;
}
