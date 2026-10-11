import React, {useMemo} from 'react';
import {collectionRegistry} from '../collections.js';
import {libraryStats} from './library-stats';
import './workbench.css';

export function Workbench({graph, hidden}) {
  const stats = useMemo(() => libraryStats(graph.nodes.filter(node => node.module)), [graph]);
  const collections = collectionRegistry.collections.filter(c => c.enabled);
  const number = value => value.toLocaleString('zh-CN');
  const percentage = value => stats.total ? `${(value / stats.total * 100).toFixed(1)}%` : '0%';
  return <main className="workbench" hidden={hidden} aria-label="知识库统计看板">
    <header className="stats-heading"><div><p>知识库概览</p><h1>统计看板</h1></div><span>当前收录内容 · 自动统计</span></header>
    <section className="stats-totals" aria-label="总量统计">
      {[[stats.total, '收录文档', '当前启用目录中的文档'], [stats.categoryCount, '分类', '按文档分类去重'], [stats.tagCount, '标签', '按标签名称去重'], [stats.references, '文档引用', '按来源与目标去重']].map(([value, label, hint]) => <div key={label}><span>{label}</span><strong>{number(value)}</strong><small>{hint}</small></div>)}
    </section>
    <section className="stats-panel" aria-labelledby="stats-collections"><div className="stats-title"><h2 id="stats-collections">目录分布</h2><span>文档构成</span></div>
      <div className="stats-composition" aria-hidden="true">{collections.map(c => <i key={c.id} style={{width: percentage(stats.collections.get(c.id) || 0), background: c.color}}/>)}</div>
      <div className="stats-collections">{collections.map(c => <div key={c.id}><span><i style={{background: c.color}}/>{c.description}</span><p><strong>{number(stats.collections.get(c.id) || 0)}</strong><small>{percentage(stats.collections.get(c.id) || 0)}</small></p><small>{c.label}</small></div>)}</div>
    </section>
    <div className="stats-columns"><section className="stats-panel" aria-labelledby="stats-categories"><div className="stats-title"><h2 id="stats-categories">分类分布</h2><span>按文档数量排序</span></div>
      {stats.total ? <div className="stats-table-wrap"><table><thead><tr><th scope="col">分类</th>{collections.map(c => <th key={c.id} scope="col">{c.label}</th>)}<th scope="col">合计</th></tr></thead><tbody>{stats.categories.map(group => <tr key={group.name}><th scope="row"><span>{group.name || '未分类'}</span><i aria-hidden="true" style={{width: `${group.total / stats.categories[0].total * 100}%`}}/></th>{collections.map(c => <td key={c.id}>{group.collections[c.id] || '—'}</td>)}<td>{number(group.total)}</td></tr>)}</tbody></table></div> : <p className="stats-empty">当前没有收录文档。</p>}
    </section><section className="stats-panel" aria-labelledby="stats-tags"><div className="stats-title"><h2 id="stats-tags">常用标签</h2><span>前 12 项</span></div><p className="stats-note">每个标签对应的文档篇数</p>
      <ol className="stats-tags">{stats.tags.slice(0, 12).map(([tag, count]) => <li key={tag}><div><span>{tag}</span><strong>{number(count)}</strong></div><i aria-hidden="true" style={{width: `${count / stats.tags[0][1] * 100}%`}}/></li>)}</ol>{!stats.tags.length && <p className="stats-empty">当前没有标签。</p>}
    </section></div>
    <footer className="stats-footnote">统计范围为当前启用的内容目录。目录比例不代表掌握率；文档引用包含正文引用与上级关系，排除缺失目标和自引用。</footer>
  </main>;
}
