import type { ReactNode, RefObject } from 'react';
import type { ReaderGraph, ReaderNode, ReaderModule, ReaderDocumentNode, Focus } from './graph.ts';
import type { MoveState } from './library.ts';
import type { Cluster, ReadingQueue, Point } from './reading.ts';
import type { useReadingHistory } from '../neural/useReadingHistory.ts';
export type ReadingController = ReturnType<typeof useReadingHistory>;
export interface CollectionAction extends MoveState {
  move(doc: ReaderNode, collection: string): Promise<void>;
}
export interface HomeProps {
  graph: ReaderGraph;
  focus: Focus;
  setFocus(focus: Focus): void;
  reading: ReadingController;
  reduced: boolean;
  collectionAction: CollectionAction | null;
}
export interface DocumentReaderProps {
  graph: ReaderGraph;
  node: ReaderDocumentNode;
  module: ReaderModule | null;
  cluster: Cluster | null;
  onCluster(cluster: Cluster | null): void;
  onClose(): void;
  onPreview(id: string | null): void;
  onResize(): void;
  reduced: boolean;
  readingLocation: ReadingController['location'];
  onReadingScroll(key: string, top: number): void;
  navigation: ReactNode;
  collectionAction: CollectionAction | null;
  queue: ReadingQueue;
}
export type RollerOption = [
  mode: string,
  label: string,
  title: string,
  count?: string | number | null,
  ref?: RefObject<HTMLButtonElement | null>,
];
export interface ListNavigationProps {
  graph: ReaderGraph;
  node: ReaderNode | undefined;
  cluster: Cluster | null;
  historyRef: RefObject<HTMLButtonElement | null>;
  latestRef: RefObject<HTMLButtonElement | null>;
  queueRef: RefObject<HTMLButtonElement | null>;
  onChoose(mode: string): void;
  collectionFilter: string;
  onFilter(value: string): void;
  documentCount?: number | null;
  totalCount?: number;
}
export interface Flight extends Point {
  key: string;
  id: string;
  title: string;
  width: number;
  fontSize: string;
  fontFamily: string;
  color: string;
}
export type NodeAnchor = (id: string) => (Point & { flowTime?: number }) | null | undefined;
export interface ClusterListProps {
  graph: ReaderGraph;
  cluster: Cluster | null;
  selected: string | null | undefined;
  anchorId?: string | null;
  onSelect(id: string, element: HTMLButtonElement): void;
  onClose(): void;
  onClear?: () => void;
  getAnchor?: NodeAnchor;
  reduced: boolean;
  onPresenceChange(visible: boolean): void;
  navigation?: React.ReactElement<ListNavigationProps>;
  pinned?: boolean;
  onPin?: () => void;
  queue: ReadingQueue;
  collectionFilter?: string;
  active?: boolean;
}
