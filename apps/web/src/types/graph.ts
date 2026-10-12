import type { LibraryDocument, LibraryActivity } from './library.ts';
interface NodeBase {
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

/** Structural nodes never carry document data; document nodes always carry a complete record. */
export type ReaderDocumentNode = NodeBase &
  LibraryDocument & {
    nodeType: 'document';
    module: string;
    modules: string[];
    folder: string;
  };
export type ReaderStructuralNode = NodeBase & { nodeType: 'core' | 'folder'; module?: never } & {
  [K in Exclude<keyof LibraryDocument, keyof NodeBase>]?: never;
};
export type ReaderNode = ReaderDocumentNode | ReaderStructuralNode;
