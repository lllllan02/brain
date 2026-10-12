// Load shared TypeScript from the web package without changing the root CLI.
import { tsImport } from 'tsx/esm/api';
export const { parseDocument, renderDocument } = await tsImport(
  '../src/library.ts',
  import.meta.url,
);
export const { documentTime } = await tsImport('../src/document-dates.ts', import.meta.url);
export const { CONTENT_COLLECTIONS, collectionRegistry } = await tsImport(
  '../src/collections.ts',
  import.meta.url,
);
