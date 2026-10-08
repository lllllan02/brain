import React, {useMemo} from 'react';
import {clusterDocuments} from './ClusterList';

export function ReaderRelations({graph, node, module, cluster, onChoose}) {
  const counts = useMemo(() => ({
    outgoing: clusterDocuments(graph, {document: node.id}).length,
    incoming: clusterDocuments(graph, {document: node.id, direction: 'incoming'}).length,
  }), [graph, node.id]);
  const outgoing = cluster?.document === node.id && cluster.direction !== 'incoming';
  const incoming = cluster?.document === node.id && cluster.direction === 'incoming';
  const category = cluster?.category === module.id;
  const tags = node.tags || [];
  const choose = (next, active) => onChoose(active ? null : next);
  return <div className="reader-relations">
    <div className="reader-property-row">
      <dl className="read-properties reader-category">
        <div><dt>分类</dt><dd>
          <button type="button" className="read-category-link" aria-label={`查看分类 ${node.category || '未分类'} 的列表`} aria-pressed={category}
            onClick={() => choose({category: module.id}, category)}>{node.category || '未分类'}</button>
        </dd></div>
      </dl>
      <nav className="reader-inline-relations" aria-label="文档引用关系">
        <button type="button" aria-label={`内部链接，${counts.outgoing} 篇`} title="这篇文章链接到的文档" aria-pressed={outgoing}
          onClick={() => choose({document: node.id}, outgoing)}>内链 <span>{counts.outgoing}</span></button>
        <span className="reader-relation-divider" aria-hidden="true">·</span>
        <button type="button" aria-label={`被引用，${counts.incoming} 篇`} title="引用这篇文章的文档" aria-pressed={incoming}
          onClick={() => choose({document: node.id, direction: 'incoming'}, incoming)}>被引 <span>{counts.incoming}</span></button>
      </nav>
    </div>
    {tags.length > 0 && <dl className="read-properties reader-tags">
      <div><dt>标签</dt><dd>{tags.map(tag => <button type="button" className="read-tag" key={tag}
        aria-label={`查看标签 ${tag} 的列表`} aria-pressed={cluster?.tag === tag}
        onClick={() => choose({tag}, cluster?.tag === tag)}>{tag}</button>)}</dd></div>
    </dl>}
  </div>;
}
