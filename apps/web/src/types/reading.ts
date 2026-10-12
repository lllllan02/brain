export interface ReadingEntry {
  key: string;
  url: string;
  id: string | null;
  scroll: number | null;
  connected?: boolean;
}
export interface Visit {
  key: string;
  id: string;
  from: string | null;
  time: number;
}
export interface TrailNode {
  id: string;
  key?: string;
  steps: number[];
  weight?: number;
  transient?: boolean;
}
export interface TrailEdge {
  from: string;
  to: string;
  step?: number;
}
export interface TrailSegment extends TrailEdge {
  key: string;
}
export interface ReadingTrail {
  live?: boolean;
  nodes: TrailNode[];
  edges: TrailEdge[];
  segments: TrailSegment[];
}
export interface Point {
  x: number;
  y: number;
}
export interface ProjectedNode extends Point, TrailNode {
  title?: string;
  current?: boolean;
  visible?: boolean;
  alpha?: number;
}
export interface TrailProjection {
  nodes: ProjectedNode[];
  edges: TrailEdge[];
  segments?: TrailSegment[];
}
export interface Cluster {
  category?: string;
  tag?: string;
  document?: string;
  direction?: 'incoming' | 'outgoing';
  recent?: { id: string }[];
  latest?: { id: string }[];
  queue?: { id: string }[];
  pinnedIds?: string[];
}
export interface ReaderCluster {
  owner: string | null;
  value: Cluster | null;
}
export interface ReadingQueue {
  items: { id: string }[];
  has(id: string): boolean;
  toggle(id: string): void;
}
export interface EnterTimeline {
  progress: number;
  animation: Animation | null;
}
