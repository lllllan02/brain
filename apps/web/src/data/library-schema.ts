import type {
  Library,
  LibraryDocument,
  Reference,
  Heading,
  ActivityEvent,
  LibraryActivity,
} from '../types/library.ts';
import {
  array,
  boolean,
  literal,
  nullable,
  number,
  object,
  optional,
  string,
} from './validation.ts';

const reference = object<Reference>({
  id: string,
  anchor: string,
  target: string,
  referenceId: string,
  kind: optional(literal('parent')),
});
const heading = object<Heading>({ id: string, title: string, level: number });
const parent = object<NonNullable<LibraryDocument['parent']>>({
  id: string,
  anchor: string,
  target: string,
  referenceId: string,
  kind: optional(literal('parent')),
  title: string,
  href: string,
});
const document = object<LibraryDocument>({
  id: string,
  path: string,
  collection: string,
  state: nullable(literal('pending', 'understood', 'unread', 'read')),
  title: string,
  aliases: array(string),
  tags: array(string),
  category: string,
  type: string,
  created: nullable(string),
  updated: nullable(string),
  modified: optional(string),
  sources: array(string),
  body: string,
  summary: string,
  parentTarget: nullable(string),
  html: string,
  toc: array(heading),
  references: array(reference),
  issues: array(object({ target: string, reason: string })),
  parent: nullable(parent),
  backlinks: optional(array(string)),
});
export const isActivityEvent = object<ActivityEvent>({
  id: string,
  kind: literal(
    'created',
    'updated',
    'moved',
    'state-changed',
    'image-created',
    'image-updated',
    'image-format',
  ),
  time: string,
  entity: string,
  title: string,
  collections: array(string),
  source: literal('metadata', 'observed'),
  docId: optional(string),
  from: optional(string),
  to: optional(string),
  files: optional(array(string)),
});
const activity = object<LibraryActivity>({
  startedAt: nullable(string),
  events: array(isActivityEvent),
  version: string,
  error: optional(string),
});
export const isLibrary = object<Library>({
  version: string,
  documents: array(document),
  activity: optional(activity),
  public: optional(boolean),
});
export function parseLibrary(value: unknown): Library {
  if (
    !isLibrary(value) ||
    new Set(value.documents.map((doc) => doc.id)).size !== value.documents.length
  )
    throw Error('文档数据格式无效，请刷新页面或重新构建文档库。');
  return value;
}
