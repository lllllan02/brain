import React, {useMemo, useState} from 'react';
import {collectionRegistry} from '../collections.js';
import {dashboardInsights} from './dashboard-insights';
import {libraryStats} from './library-stats';
import './dashboard-insights.css';

function Documents({docs, count}) {
  if (!docs.length) return <p className="stats-empty">此范围暂无文档。</p>;
  return <ul className="insight-documents">{docs.map(doc => <li key={doc.id}><a href={`#/doc/${encodeURIComponent(doc.id)}`}>{doc.title}</a>{count && <small>{count(doc)}</small>}</li>)}</ul>;
}

export function DashboardInsights({graph}) {
  const [category, setCategory] = useState(null);
  const [distribution, setDistribution] = useState('categories');
  const [allCategories, setAllCategories] = useState(false);
  const documents = useMemo(()=>graph.nodes.filter(node=>node.module),[graph]);
  const selected = category !== null && documents.some(doc=>(doc.category?.trim() || '')===category) ? category : null;
  const data = useMemo(()=>dashboardInsights(documents,selected),[documents,selected]);
  const stats = useMemo(()=>libraryStats(data.scoped),[data]);
  const collections = collectionRegistry.collections.filter(c=>c.enabled);
  const percent = count => stats.total ? `${(count/stats.total*100).toFixed(1)}%` : '0%';
  const scopeName = selected===null ? '全部专题' : selected || '未分类';
  return <section className="dashboard-insights" aria-labelledby="insights-title">
    <header className="insights-heading"><div><h2 id="insights-title">内容概览</h2><p>以下统计随专题筛选，展开查看对应文章。</p></div><label>专题<select aria-label="概览专题" value={selected===null?'all':`category:${selected}`} onChange={event=>{setCategory(event.target.value==='all'?null:event.target.value.slice(9));setAllCategories(false);}}><option value="all">全部专题</option>{data.categories.map(name=><option key={name} value={`category:${name}`}>{name || '未分类'}</option>)}</select></label></header>
    <dl className="insights-totals" aria-label={`${scopeName}总量`}>{[[stats.total,'文档'],[stats.categoryCount,'分类'],[stats.tagCount,'标签'],[stats.references,'范围内引用']].map(([count,label])=><div key={label}><dt>{label}</dt><dd>{count.toLocaleString('zh-CN')}</dd></div>)}</dl>
    <div className="insights-grid">
      <section className="stats-panel" aria-labelledby="insight-collections-title"><div className="stats-title"><h3 id="insight-collections-title">目录构成</h3><span>{scopeName}</span></div>
        <div className="insight-collections">{collections.map(c=>{const docs=data.scoped.filter(doc=>doc.collection===c.id);return <details key={`${selected}-${c.id}`}><summary><span className="insight-collection-name"><span><i style={{background:c.color}}/>{c.description}</span><span className="insight-collection-track" aria-hidden="true"><i style={{width:percent(docs.length),background:c.color}}/></span></span><strong>{docs.length}</strong><small>{percent(docs.length)}</small></summary><Documents docs={docs}/></details>;})}</div>
        <p className="pulse-caption">目录比例表示内容构成，不表示掌握率。</p>
      </section>
      <section className="stats-panel" aria-labelledby="insight-distribution-title"><div className="stats-title"><h3 id="insight-distribution-title">主题分布</h3><div className="pulse-segment" aria-label="主题分布维度">{[['categories','分类'],['tags','标签']].map(([id,label])=><button key={id} aria-pressed={distribution===id} onClick={()=>setDistribution(id)}>{label}</button>)}</div></div>
        <div className="insight-distribution-scroll">{distribution==='categories' ? <>{stats.total ? <div className="stats-table-wrap"><table><thead><tr><th scope="col">分类</th>{collections.map(c=><th key={c.id} scope="col">{c.label}</th>)}<th scope="col">合计</th></tr></thead><tbody>{(allCategories?stats.categories:stats.categories.slice(0,5)).map(group=><tr key={group.name}><th scope="row"><button className="insight-category" onClick={()=>setCategory(group.name)}>{group.name || '未分类'}</button></th>{collections.map(c=><td key={c.id}>{group.collections[c.id] || '—'}</td>)}<td>{group.total}</td></tr>)}</tbody></table>{stats.categories.length>5 && <button className="stats-expand" aria-expanded={allCategories} onClick={()=>setAllCategories(value=>!value)}>{allCategories?'收起分类':`查看全部 ${stats.categories.length} 个分类`}</button>}</div>:<p className="stats-empty">此范围暂无文档。</p>}</> : <>{stats.tags.length ? <ol className="stats-tags">{stats.tags.slice(0,12).map(([tag,count])=><li key={tag}><div><span>{tag}</span><strong>{count}</strong></div><i aria-hidden="true" style={{width:`${count/stats.tags[0][1]*100}%`}}/></li>)}</ol>:<p className="stats-empty">此范围暂无标签。</p>}</>}</div>
        <p className="pulse-caption">{distribution==='categories'?'点击分类筛选本区统计；未分类不计入分类总数。':'按每个标签对应的文档数排序，展示前 12 项。'}</p>
      </section>
      <section className="stats-panel" aria-labelledby="insight-sources-title"><div className="stats-title"><h3 id="insight-sources-title">资料来源与引用</h3><span>{data.domains.length} 个域名</span></div>
        <details key={`${selected}-cited`}><summary><span>被 Inbox / Notes 引用的导读</span><strong>{data.citedReadings.length} / {data.readings.length}</strong></summary><Documents docs={data.citedReadings}/></details>
        {data.domains.length?<div className="insight-sources" key={selected}>{data.domains.map(({host,docs})=><details key={host}><summary><span>{host}</span><strong>{docs.length}<small> 篇</small></strong></summary><Documents docs={docs}/></details>)}</div>:<p className="stats-empty">此范围暂无可识别网址的外部导读。</p>}
        <p className="pulse-caption">{data.withSource} / {data.readings.length} 篇导读有可识别网址。同篇同域名计一次，多来源可分属多个域名；被引用不表示已吸收。</p>
      </section>
      <section className="stats-panel" aria-labelledby="insight-links-title"><div className="stats-title"><h3 id="insight-links-title">文档关系</h3><span>{data.connected.length} 篇有引用关系</span></div>
        <p className="insight-list-label">引用较多的文章 · 前 5 篇</p>
        <Documents docs={data.ranked.slice(0,5)} count={doc=>`${data.incoming.get(doc.id).size} 篇引用`}/>
        <details key={`${selected}-isolated`}><summary><span>暂无引用关系的文章</span><strong>{data.isolated.length}</strong></summary><Documents docs={data.isolated}/></details>
        <p className="pulse-caption">此卡片按全库核对跨专题关系；顶部引用总量仅计范围内关系。均含正文与上级引用，排除自身和缺失目标。独立笔记不一定有问题。</p>
      </section>
    </div>
  </section>;
}
