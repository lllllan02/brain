import type { ListNavigationProps, RollerOption } from '../types/ui.ts';
import { clusterDocuments } from './ClusterList.tsx';
import { RollerSelect } from './RollerSelect.tsx';

export function ListNavigation({
  graph,
  node,
  cluster,
  queue,
  queueRef,
  onChoose,
}: ListNavigationProps) {
  const count = node
    ? clusterDocuments(graph, { document: node.id, direction: 'suggested' }).length
    : 0;
  const options: RollerOption[] = [];
  if (node) options.push(['suggested', '建议阅读', '这篇文章建议依次阅读的文档', count]);
  options.push([
    'queue',
    '阅读中',
    '状态为阅读中的文档',
    clusterDocuments(graph, { queue: queue.items }).length,
    queueRef,
  ]);
  const active = cluster?.queue
    ? 'queue'
    : cluster?.document && cluster.direction === 'suggested'
      ? 'suggested'
      : null;
  return (
    <div className="list-navigation-controls">
      <RollerSelect options={options} active={active} onChoose={onChoose} label="文档列表模式" />
    </div>
  );
}
