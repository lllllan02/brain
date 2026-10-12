/** File-derived data shared by the local server, static export and reader. */
export interface Reference {
  id: string;
  anchor: string;
  target: string;
  referenceId: string;
  kind?: 'parent';
}
export interface Heading {
  id: string;
  title: string;
  level: number;
}
export interface ParsedDocument {
  id: string;
  path: string;
  collection: string;
  title: string;
  aliases: string[];
  tags: string[];
  category: string;
  type: string;
  created: string | null;
  updated: string | null;
  modified?: string;
  sources: string[];
  body: string;
  summary: string;
  parentTarget: string | null;
}
export interface LibraryDocument extends ParsedDocument {
  html: string;
  toc: Heading[];
  references: Reference[];
  issues: { target: string; reason: string }[];
  parent: (Reference & { title: string; href: string }) | null;
  backlinks?: string[];
}
export type ActivityKind =
  'created' | 'updated' | 'moved' | 'image-created' | 'image-updated' | 'image-format';
export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  time: string;
  entity: string;
  title: string;
  collections: string[];
  source: 'metadata' | 'observed';
  docId?: string;
  from?: string;
  to?: string;
  files?: string[];
}
export interface LibraryActivity {
  startedAt: string | null;
  events: ActivityEvent[];
  version: string;
  error?: string;
}
export interface Library {
  version: string;
  documents: LibraryDocument[];
  activity?: LibraryActivity;
  public?: boolean;
}
export type MoveState =
  | { status: 'idle'; pending: false; id?: never; collection?: never; error?: never }
  | { status: 'pending'; pending: true; id: string; collection?: never; error?: never }
  | { status: 'success'; pending: false; id: string; collection: string; error?: never }
  | { status: 'error'; pending: false; id: string; error: string; collection?: never };
