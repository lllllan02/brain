import React, {useEffect, useId, useMemo, useRef, useState} from 'react';
import {activityDay} from './activity-model';
import {dashboardPulse} from './dashboard-model';
import {collectionLabel} from '../collections.js';
import './dashboard-pulse.css';

function Trend({series, selected, onSelect}) {
  const gradient = useId();
  const host = useRef(null);
  const [width, setWidth] = useState(648);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {if (entry.contentRect.width > 0) setWidth(Math.max(260, entry.contentRect.width));});
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  const plotWidth = width - 60;
  const max = Math.max(1, ...series.flatMap(d => [d.created, d.updated]));
  const ceiling = Math.ceil(max / 4) * 4;
  const x = i => 36 + i / Math.max(1, series.length - 1) * plotWidth;
  const y = value => 174 - value / ceiling * 144;
  const path = key => series.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d[key])}`).join(' ');
  const day = series[selected];
  return <div className="pulse-chart" ref={host}>
    <div className="pulse-readout" aria-live="polite"><time>{day.day}</time><span><i/>新增 <b>{day.created}</b></span><span><i className="updated"/>更新 <b>{day.updated}</b></span></div>
    <svg viewBox={`0 0 ${width} 210`} role="img" aria-label={`每日新增与更新趋势，最高刻度 ${ceiling} 篇。通过下方日期控件查看每日数值。`}>
      <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#739c50" stopOpacity=".22"/><stop offset="100%" stopColor="#739c50" stopOpacity="0"/></linearGradient></defs>
      {[0,1,2,3,4].map(i => <g key={i}><line x1="36" x2={width-24} y1={y(ceiling*i/4)} y2={y(ceiling*i/4)} className="pulse-grid"/><text x="25" y={y(ceiling*i/4)+4} textAnchor="end">{ceiling*i/4}</text></g>)}
      <path d={`${path('created')} L${width-24},174 L36,174 Z`} fill={`url(#${gradient})`}/>
      <path key={series.length} pathLength="1" className="pulse-line pulse-line-primary" d={path('created')} fill="none" stroke="#26362a" strokeWidth="2.5" strokeLinejoin="round"/>
      <path className="pulse-line pulse-line-secondary" d={path('updated')} fill="none" stroke="#738ca8" strokeWidth="2" strokeDasharray="5 5"/>
      <line x1={x(selected)} x2={x(selected)} y1="20" y2="174" stroke="#8b9d86" strokeDasharray="3 4"/>
      {['created','updated'].map(key => <circle key={key} cx={x(selected)} cy={y(day[key])} r="4" fill={key==='created'?'#26362a':'#738ca8'} stroke="#fff" strokeWidth="2"/>)}
      {[0,Math.floor((series.length-1)/2),series.length-1].map(i=><text key={i} x={x(i)} y="202" textAnchor={i===0?'start':i===series.length-1?'end':'middle'}>{series[i].day.slice(5).replace('-','/')}</text>)}
      {series.map((d,i)=><rect key={d.day} x={x(i)-plotWidth/Math.max(1,series.length-1)/2} y="16" width={plotWidth/Math.max(1,series.length-1)} height="162" fill="transparent" onPointerEnter={()=>onSelect(i)} onClick={()=>onSelect(i)}/>)}
    </svg>
    <label className="pulse-date-slider">逐日查看<input aria-label="趋势日期" aria-valuetext={`${day.day}，新增 ${day.created} 篇，更新 ${day.updated} 篇`} type="range" min="0" max={series.length-1} value={selected} onChange={e=>onSelect(Number(e.target.value))}/><span>{day.day.slice(5).replace('-','/')}</span></label>
  </div>;
}

export function DashboardPulse({graph, reading, queue, hidden}) {
  const [days, setDays] = useState(7), [selected, setSelected] = useState(6), [tab, setTab] = useState('recent');
  const [today, setToday] = useState(() => activityDay(new Date().toISOString()));
  useEffect(() => {if (hidden) return; setToday(activityDay(new Date().toISOString())); const timer=setInterval(()=>setToday(activityDay(new Date().toISOString())),60000);return()=>clearInterval(timer);},[hidden]);
  const docs = useMemo(()=>graph.nodes.filter(n=>n.module),[graph]);
  const pulse = useMemo(()=>dashboardPulse(graph.activity,docs,today,days),[graph.activity,docs,today,days]);
  const recent = (reading?.recent || []).filter(item=>graph.index.get(item.id)?.module);
  const queued = (queue?.items || []).filter(item=>graph.index.get(item.id)?.module);
  const list = tab==='recent'?recent:queued;
  return <>
    <div className="pulse-layout">
      <section className="stats-panel pulse-hero" aria-labelledby="pulse-title">
        <div className="stats-title"><h2 id="pulse-title">积累趋势</h2><div className="pulse-segment" aria-label="趋势时间范围">{[7,30].map(n=><button key={n} type="button" aria-pressed={days===n} onClick={()=>{setDays(n);setSelected(n-1);}}>{n} 天</button>)}</div></div>
        <div className="pulse-hero-body"><div className="pulse-figure"><span>新增文档</span><p key={`${days}-${pulse.counts.created}`} className="pulse-number"><strong>{pulse.counts.created}</strong><small>篇</small></p><span className="pulse-badge">近 {days} 天已知记录</span><dl><div><dt>更新文档</dt><dd>{pulse.counts.updated}<small> 篇</small></dd></div><div><dt>有记录的日期</dt><dd>{pulse.activeDays}<small> 天</small></dd></div></dl></div><Trend series={pulse.series} selected={selected} onSelect={setSelected}/></div>
        <p className="pulse-caption">{pulse.start} — {today} · 数字按区间去重，曲线按天去重。{pulse.complete?'当前区间已启用变更检测。':'部分日期仅有文档日期回填；无记录不代表没有变化。'}</p>
      </section>
      <section className="stats-panel pulse-reading" aria-labelledby="pulse-reading-title"><div className="stats-title"><h2 id="pulse-reading-title">接着读</h2><span>当前浏览器</span></div><div className="pulse-reading-tabs" aria-label="阅读列表">{[['recent','最近阅读',recent.length],['queue','待阅读',queued.length]].map(([id,label,count])=><button key={id} aria-pressed={tab===id} onClick={()=>setTab(id)}>{label}<span>{count}</span></button>)}</div>
        {list.length ? <ul className="pulse-docs">{list.slice(0,4).map(item=>{const doc=graph.index.get(item.id);return <li key={item.id}><a href={`#/doc/${encodeURIComponent(doc.id)}`}><span className="pulse-doc-icon" aria-hidden="true">{tab==='recent'?'↗':'▤'}</span><span><strong>{doc.title}</strong><small>{collectionLabel(doc.collection)}{doc.category?` / ${doc.category}`:''}</small></span><span className="pulse-doc-arrow" aria-hidden="true">→</span></a></li>;})}</ul>:<div className="pulse-empty"><span aria-hidden="true">{tab==='recent'?'↗':'▤'}</span><p>{tab==='recent'?'还没有阅读记录':'待阅读列表是空的'}</p><small>{tab==='recent'?'打开一篇文档后，可在这里继续阅读。':'阅读时点击书签，将文档加入待阅读。'}</small></div>}
        <p className="pulse-caption">{list.length>4?`显示${tab==='recent'?'最近阅读的':'最早加入的'} 4 篇。`:''}阅读记录保存在本机，不代表已掌握。</p>
      </section>
    </div>
    <div className="pulse-secondary">
      <section className="stats-panel" aria-labelledby="pulse-flow-title"><div className="stats-title"><h2 id="pulse-flow-title">学习状态流转</h2><span>近 {days} 天</span></div><div className="pulse-flow"><div><span>Inbox</span><i aria-hidden="true">→</i><span>Notes</span><strong>{pulse.counts.learned}<small> 篇</small></strong></div><div><span>Notes</span><i aria-hidden="true">→</i><span>Inbox</span><strong>{pulse.counts.relearn}<small> 篇</small></strong></div></div><p className="pulse-caption">按迁移方向去重，记录确认理解与重新学习。</p></section>
      <section className="stats-panel" aria-labelledby="pulse-topics-title"><div className="stats-title"><h2 id="pulse-topics-title">近期活跃主题</h2><span>近 {days} 天 · 文档数</span></div>{pulse.topics.length?<ol className="pulse-topics">{pulse.topics.map(topic=><li key={topic.name}><span>{topic.name}</span><div><i style={{width:`${topic.count/pulse.topics[0].count*100}%`}}/></div><strong>{topic.count}</strong></li>)}</ol>:<p className="stats-empty">这个区间没有已知的文档变化。</p>}<p className="pulse-caption">新增、更新或迁移的文档，按当前分类归组。</p></section>
    </div>
  </>;
}
