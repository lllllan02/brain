import type { LibraryDocument, LibraryActivity } from './library.ts';
export interface ReaderNode extends Partial<LibraryDocument> {
  id: string;
  title: string;
  kind: string;
  tags: string[];
  module?: string;
  modules?: string[];
  folder?: string;
  text?: string;
  short?: string;
  angle?: number;
  level?: number;
  in?: number;
  out?: number;
  deg?: number;
  mutual?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}
export interface ReaderModule {
  id: string;
  title: string;
  en: string;
  kind: string;
  folder: string;
  angle: number;
  icon: string;
  color: string;
  filter: string;
  flip: number;
}
export interface ReaderLink {
  a: string;
  b: string;
  s: string;
  t: string;
  kind: string;
  ab: number;
  ba: number;
  w: number;
  both: boolean;
}
export interface ReaderGraph {
  nodes: ReaderNode[];
  index: Map<string, ReaderNode>;
  modules: ReaderModule[];
  links: ReaderLink[];
  kinds: Record<string, { label: string; en: string; color: string }>;
  styles: Record<string, { color: string; filter: string; flip: number }>;
  activity?: LibraryActivity;
  public: boolean;
}
export interface Focus {
  sel: string | null;
  mod: string | null;
}

/** Document nodes are created from the complete file-derived record. */
export type ReaderDocumentNode = ReaderNode & LibraryDocument & { module: string };
