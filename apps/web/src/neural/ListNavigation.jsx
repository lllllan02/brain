import React from 'react';
import {RollerSelect} from './RollerSelect';
import {CONTENT_COLLECTIONS, collectionLabel} from '../collections.js';
import {clusterDocuments} from './ClusterList';

const modes = [
  ['outgoing', '内链', '这篇文章链接到的文档'],
  ['incoming', '被引', '引用这篇文章的文档'],
  ['queue', '待阅读', '已加入待阅读的文档'],
  ['recent', '最近阅读', '最近阅读过的文档'],
  ['latest', '最新文档', '最近更新的文档'],
];

export function ListNavigation({graph, node, cluster, historyRef, latestRef, queueRef, onChoose, collectionFilter, onFilter}) {
  const active = cluster?.queue ? 'queue' : cluster?.latest ? 'latest' : cluster?.recent ? 'recent'
    : cluster?.document ? cluster.direction || 'outgoing' : null;
  const options = modes.filter(([mode]) => node || !['outgoing', 'incoming'].includes(mode)).map(([mode, label, title]) => [
    mode, label, title,
    ['outgoing', 'incoming'].includes(mode) ? clusterDocuments(graph, {document: node.id, direction: mode}).length : null,
    mode === 'queue' ? queueRef : mode === 'recent' ? historyRef : mode === 'latest' ? latestRef : undefined,
  ]);
  const collections = [['all', '显示全部', '显示当前列表的全部目录'], ...CONTENT_COLLECTIONS.map(id => [id, collectionLabel(id), `只显示 ${collectionLabel(id)} 目录的文档`])];
  return <div className="list-navigation-controls">
    <RollerSelect options={options} active={active} onChoose={onChoose} label="文档列表模式"/>
    <RollerSelect options={collections} active={collectionFilter} onChoose={onFilter} label="列表目录筛选"/>
  </div>;
}
