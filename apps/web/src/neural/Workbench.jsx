import React, {memo, useMemo, useState} from 'react';
import {collectionRegistry} from '../collections.js';
import {libraryStats} from './library-stats';
import './workbench.css';
import {ActivityTimeline} from './ActivityTimeline';
import {DashboardPulse} from './DashboardPulse';

export const Workbench = memo(function Workbench({graph, hidden, reading, queue}) {
  const stats = useMemo(() => libraryStats(graph.nodes.filter(node => node.module)), [graph]);
  const [allCategories, setAllCategories] = useState(false);
  const collections = collectionRegistry.collections.filter(c => c.enabled);
  const number = value => value.toLocaleString('zh-CN');
  const percentage = value => stats.total ? `${(value / stats.total * 100).toFixed(1)}%` : '0%';
  return <main className="workbench" hidden={hidden} aria-label="知识库统计看板">
    <header className="stats-heading"><div><p>视界 · 个人知识库</p><h1>知识库概览</h1><p className="stats-description">文档构成、主题分布与近期活动。</p></div><span className="stats-live"><i/>随文档自动更新</span></header>
    <DashboardPulse graph={graph} reading={reading} queue={queue} hidden={hidden}/>
    <div className="stats-overview">
      <section className="stats-panel stats-hero" aria-labelledby="stats-collections">
        <div className="stats-title"><h2 id="stats-collections">知识积累</h2><span>当前收录</span></div>
        <div className="stats-hero-body">
          <div className="stats-main-number"><span>收录文档</span><p><strong>{number(stats.total)}</strong><small>篇</small></p><span className="stats-scope">{collections.length} 个内容目录</span><p className="stats-hero-note">笔记、导读与术语，<br/>汇集于同一个知识库。</p></div>
          <div className="stats-distribution"><div className="stats-title"><h3>目录分布</h3><span>文档构成</span></div>
            <div className="stats-collections">{collections.map(c => <div key={c.id}><div className="stats-collection-label"><span><i style={{background: c.color}}/>{c.description}</span><small>{c.label}</small></div><div className="stats-collection-value"><strong>{number(stats.collections.get(c.id) || 0)}</strong><small>{percentage(stats.collections.get(c.id) || 0)}</small></div><div className="stats-collection-track" aria-hidden="true"><i style={{width: percentage(stats.collections.get(c.id) || 0), background: c.color}}/></div></div>)}</div>
          </div>
        </div>
        <p className="stats-hero-caption">目录展示内容构成，不代表学习进度或掌握率。</p>
      </section>
      <section className="stats-totals" aria-label="总量统计">
        {[[stats.categoryCount, '分类', '按文档分类去重', 'category'], [stats.tagCount, '标签', '按标签名称去重', 'tag'], [stats.references, '文档引用', '正文引用与上级关系', 'link']].map(([value, label, hint, icon]) => <div className="stats-panel stats-metric" key={label}><div className="stats-metric-head"><span>{label}</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d={icon === 'category' ? 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z' : icon === 'tag' ? 'M3 3h8l10 10-8 8L3 11Z M7 7h.01' : 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2 M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2'}/></svg></div><strong>{number(value)}</strong><small>{hint}</small></div>)}
      </section>
    </div>
    <ActivityTimeline activity={graph.activity} graph={graph}/>
    <div className="stats-columns"><section className="stats-panel" aria-labelledby="stats-categories"><div className="stats-title"><h2 id="stats-categories">分类分布</h2><span>按文档数量排序</span></div>
      {stats.total ? <div className="stats-table-wrap"><table><thead><tr><th scope="col">分类</th>{collections.map(c => <th key={c.id} scope="col">{c.label}</th>)}<th scope="col">合计</th></tr></thead><tbody>{(allCategories ? stats.categories : stats.categories.slice(0, 8)).map(group => <tr key={group.name}><th scope="row"><span>{group.name || '未分类'}</span><i aria-hidden="true" style={{width: `${group.total / stats.categories[0].total * 100}%`}}/></th>{collections.map(c => <td key={c.id}>{group.collections[c.id] || '—'}</td>)}<td>{number(group.total)}</td></tr>)}</tbody></table>{stats.categories.length > 8 && <button type="button" className="stats-expand" aria-expanded={allCategories} onClick={()=>setAllCategories(value=>!value)}>{allCategories ? '收起分类' : `查看全部 ${stats.categories.length} 个分类`}<span aria-hidden="true">{allCategories?'−':'+'}</span></button>}</div> : <p className="stats-empty">当前没有收录文档。</p>}
    </section><section className="stats-panel" aria-labelledby="stats-tags"><div className="stats-title"><h2 id="stats-tags">常用标签</h2><span>前 12 项</span></div><p className="stats-note">每个标签对应的文档篇数</p>
      <ol className="stats-tags">{stats.tags.slice(0, 12).map(([tag, count]) => <li key={tag}><div><span>{tag}</span><strong>{number(count)}</strong></div><i aria-hidden="true" style={{width: `${count / stats.tags[0][1] * 100}%`}}/></li>)}</ol>{!stats.tags.length && <p className="stats-empty">当前没有标签。</p>}
    </section></div>
    <footer className="stats-footnote">统计范围为当前启用的内容目录。目录比例不代表掌握率；文档引用包含正文引用与上级关系，排除缺失目标和自引用。</footer>
  </main>;
});
