import React from 'react';
import {clusterDocuments} from './ClusterList';

export function ListNavigation({graph, node, cluster, historyRef, latestRef, onChoose}) {
  const active = cluster?.latest ? 'latest' : cluster?.recent ? 'recent'
    : cluster?.document ? cluster.direction || 'outgoing' : null;
  const modes = [
    ['outgoing', '内链', node ? `这篇文章链接到的文档` : '打开文档后可查看'],
    ['incoming', '被引', node ? `引用这篇文章的文档` : '打开文档后可查看'],
    ['recent', '最近阅读', '最近阅读过的文档'],
    ['latest', '最新文档', '最近更新的文档'],
  ];
  return <nav className="list-modes" aria-label="文档列表模式" style={{'--active-mode': Math.max(0, modes.findIndex(([mode]) => mode === active))}}>
    <span className="list-mode-indicator" aria-hidden="true" style={{opacity: active ? 1 : 0}}/>
    {modes.map(([mode, label, title], index) => {
      const count = index < 2 && node ? clusterDocuments(graph, {document: node.id, direction: mode}).length : null;
      return <button key={mode} type="button" title={title} disabled={index < 2 && !node}
        ref={mode === 'recent' ? historyRef : mode === 'latest' ? latestRef : undefined}
        aria-pressed={active === mode} onClick={() => onChoose(mode)}>
        {label}{count !== null && <small>{count}</small>}
      </button>;
    })}
  </nav>;
}
