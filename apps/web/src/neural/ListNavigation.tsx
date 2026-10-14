import type { ListNavigationProps } from '../types/ui.ts';
import { clusterDocuments } from './ClusterList.tsx';

export function ListNavigation({ graph, node, cluster, onChoose }: ListNavigationProps) {
  const count = node
    ? clusterDocuments(graph, { document: node.id, direction: 'suggested' }).length
    : 0;
  return (
    <nav className="list-navigation-controls" aria-label="文档列表模式">
      <button
        type="button"
        className="list-suggested-option"
        disabled={!node}
        aria-pressed={cluster?.document === node?.id && cluster?.direction === 'suggested'}
        onClick={() => onChoose('suggested')}
      >
        建议阅读 <small>{count}</small>
      </button>
    </nav>
  );
}
