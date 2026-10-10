import {Icon} from './icons';
import React, {useEffect, useMemo, useRef} from 'react';

import {usePresence} from '../motion/usePresence';
import {MOTION, damp, smooth, stagger, curveSamples, pointAlongCurve} from '../motion/tokens.js';

const clusterKey = cluster => !cluster ? null : cluster.recent ? 'recent' : cluster.document ? `document:${cluster.document}:${cluster.direction || 'outgoing'}` : cluster.tag ? `tag:${cluster.tag}` : `category:${cluster.category}`;

export function clusterDocuments(graph, cluster) {
  if (!cluster) return [];
  if (cluster.recent) return cluster.recent.map(item => graph.index.get(item.id)).filter(node => node?.module);
  if (cluster.document) {
    const source = graph.index.get(cluster.document);
    const ids = cluster.direction === 'incoming' ? source?.backlinks : source?.references?.map(reference => reference.id);
    return [...new Set(ids || [])]
      .filter(id => id !== source?.id)
      .map(id => graph.index.get(id))
      .filter(node => node?.module);
  }
  return graph.nodes.filter(node => node.module && (cluster.tag
    ? node.tags?.includes(cluster.tag)
    : node.module === cluster.category))
    .sort((a, b) => a.title.localeCompare(b.title, 'zh-CN') || a.id.localeCompare(b.id));
}

export function ClusterList({graph, cluster, selected, onSelect, onClose, onClear, getAnchor, reduced, onPresenceChange}) {
  const scroll = useRef(null), svg = useRef(null), origin = useRef(selected);
  const {shown, ref: layer, closing} = usePresence(cluster, clusterKey(cluster), reduced, 'translateX(-12px)');
  if (!closing && selected) origin.current = selected;
  const documents = useMemo(() => clusterDocuments(graph, shown), [graph, shown]);
  const kind = shown?.recent ? '' : shown?.document ? shown.direction === 'incoming' ? '被引用' : '内部链接' : shown?.tag ? '标签' : '分类';
  const title = shown?.recent ? '最近阅读' : shown?.document ? graph.index.get(shown.document)?.title || '文档' : shown?.tag || graph.modules.find(item => item.id === shown?.category)?.title || '未分类';
  const selectionKey = clusterKey(shown);
  useEffect(() => { onPresenceChange(Boolean(shown)); }, [Boolean(shown), onPresenceChange]);

  useEffect(() => {
    if (!shown || !scroll.current) return;
    scroll.current.scrollTop = 0;
    // Automatically opened references should not move focus away from the reader.
    if (!shown.document && !shown.recent) scroll.current.focus({preventScroll: true});
  }, [selectionKey]);

  useEffect(() => {
    if (!shown || !layer.current) return;
    let raf, previous = 0, elapsed = 0, source = null, sourceId = origin.current, sourceTween = null;
    const visibility = new Map();
    // SVG connects the current reading node to only the currently visible
    // document ports. Scrolling never creates hidden lines outside the list.
    const update = now => {
      if (!layer.current || !scroll.current || !svg.current) return;
      raf = requestAnimationFrame(update);
      if (document.hidden) { previous = 0; return; }
      const dt = previous ? Math.min(now - previous, MOTION.maxFrame) : 0;
      elapsed += dt;
      previous = now;
      const box = layer.current.getBoundingClientRect();
      const viewport = scroll.current.getBoundingClientRect();
      const anchor = getAnchor?.(origin.current);
      // Never draw from an invented or stale origin while a node is unavailable.
      svg.current.style.opacity = anchor ? 1 : 0;
      if (!anchor) return;
      if (sourceId !== origin.current) { sourceTween = source ? {from: {...source}, elapsed: 0} : null; sourceId = origin.current; }
      if (sourceTween && !reduced) {
        sourceTween.elapsed += dt;
        const p = Math.min(1, sourceTween.elapsed / MOTION.enter), k = smooth(p);
        source = {x: sourceTween.from.x + (anchor.x - sourceTween.from.x) * k, y: sourceTween.from.y + (anchor.y - sourceTween.from.y) * k};
        if (p === 1) sourceTween = null;
      } else source = {...anchor};
      const startX = source.x - box.left, startY = source.y - box.top;
      const rows = scroll.current.querySelectorAll('.cluster-list-item');
      const paths = svg.current.querySelectorAll('path');
      const sparks = svg.current.querySelectorAll('.cluster-thread-sparks');
      rows.forEach((row, i) => {
        const port = row.querySelector('.cluster-card-port').getBoundingClientRect();
        const endY = port.top + port.height / 2, visible = endY > viewport.top + 3 && endY < viewport.bottom - 3;
        const path = paths[i];
        if (!path) return;
        const edge = Math.max(0, Math.min(1, (endY - viewport.top) / 18, (viewport.bottom - endY) / 18));
        const alpha = reduced ? edge : (visibility.get(i) || 0) + (edge - (visibility.get(i) || 0)) * damp(dt / 1000, .08);
        visibility.set(i, alpha);
        path.style.strokeOpacity = alpha * (row.getAttribute('aria-current') ? .9 : .48);
        const glow = sparks[i];
        if (glow) glow.style.opacity = alpha;
        if (!visible && alpha < .001) return;
        const endX = port.left + port.width / 2 - box.left, targetY = endY - box.top;
        const span = Math.max(28, (endX - startX) * .52);
        path.setAttribute('d', `M ${startX} ${startY} C ${startX + span} ${startY}, ${endX - span * .65} ${targetY}, ${endX} ${targetY}`);
        if (glow) {
          const reveal = smooth((elapsed - MOTION.enter - stagger(i)) / MOTION.enter);
          const samples = curveSamples({x: startX, y: startY, endX, endY: targetY, bend: span});
          const ripples = glow.querySelectorAll('.cluster-flow-ripple');
          glow.querySelectorAll('.cluster-flow-dot').forEach((dot, j) => {
            const travel = elapsed / MOTION.flow + (i * .19 + j * .5) % 1;
            const progressAlong = travel % 1;
            const incoming = shown.direction === 'incoming';
            const t = incoming ? 1 - progressAlong : progressAlong;
            const {x, y} = pointAlongCurve(samples, t);
            const fade = Math.min(1, t / .12, (1 - t) / .18);
            dot.setAttribute('cx', x); dot.setAttribute('cy', y);
            dot.setAttribute('opacity', smooth(fade) * reveal * (j ? .5 : .9));
            // A completed trip emits one soft wave at the actual list endpoint.
            const ripple = ripples[j], progress = Math.min(1, progressAlong / .22);
            ripple.setAttribute('cx', incoming ? startX : endX); ripple.setAttribute('cy', incoming ? startY : targetY);
            ripple.setAttribute('r', 4 + progress * 14);
            ripple.setAttribute('opacity', travel >= 1 ? (1 - progress) ** 2 * reveal * .5 : 0);
          });
        }
      });
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [selectionKey, documents, getAnchor, reduced]);

  if (!shown) return null;
  return <div ref={layer} className={`cluster-fan${closing ? ' is-closing' : ''}`} inert={closing}>
    <svg ref={svg} className="cluster-fan-lines" aria-hidden="true" key={`lines:${selectionKey}`}>
      {documents.map((node, index) => <path key={node.id} pathLength="1" className={node.id === selected ? 'is-current' : ''}
        style={{'--fan-delay': `${stagger(index)}ms`}}/>)}
      {!reduced && documents.map(node => <g key={`sparks:${node.id}`} className="cluster-thread-sparks">
        <circle className="cluster-flow-ripple" r="4" opacity="0"/><circle className="cluster-flow-ripple" r="4" opacity="0"/>
        <circle className="cluster-flow-dot" r="1.8" opacity="0"/><circle className="cluster-flow-dot" r="1.2" opacity="0"/>
      </g>)}
    </svg>
    <aside id={shown.recent ? 'reading-history' : undefined} className={`cluster-list${shown.recent ? ' cluster-history' : ''}`} aria-label={shown.recent ? '最近阅读' : `${kind} ${title} 的文档列表`}>
      <header className="cluster-list-header"><div>{kind && <span>{kind}</span>}<h2>{title}</h2><small>{documents.length} 篇</small></div>
        <button type="button" onClick={onClose} aria-label={shown.recent ? '收起最近阅读' : '关闭文档列表'} title="关闭列表"><Icon name="close" size={16}/></button>
      </header>
      <div className="cluster-list-scroll" ref={scroll} tabIndex={0} role="region" aria-label={`${title}文档，可滚动浏览`}>
        {documents.length ? <ul key={selectionKey}>{documents.map((node, index) => <li key={node.id}>
          <button type="button" className="cluster-list-item" style={{'--fan-delay': `${stagger(index)}ms`}}
            aria-current={node.id === selected ? 'page' : undefined} onClick={() => onSelect(node.id)}>
            <i className={`cluster-card-port${node.collection === 'inbox' ? ' is-inbox' : node.collection === 'readings' ? ' is-reading' : ''}`} aria-hidden="true"/>
            {shown.recent && <small className="cluster-history-index">{shown.recent.findIndex(item => item.id === node.id) + 1}</small>}
            <span><strong>{node.title}</strong></span>
            {shown.recent && node.id === selected && <small className="cluster-history-current">当前</small>}
          </button>
        </li>)}</ul> : <p className="cluster-list-empty">{shown.recent ? '打开文档后，这里会留下阅读足迹' : shown.document ? shown.direction === 'incoming' ? '还没有其他文档引用这篇文章' : '这篇文章没有可打开的内部链接' : '暂时没有匹配的文档'}</p>}
      </div>
      {shown.recent && <footer className="cluster-history-footer"><span>同篇去重 · 最多 50 篇</span><button type="button" onClick={onClear} disabled={!documents.length} title="清空最近阅读记录"><Icon name="trash" size={14}/>清空</button></footer>}
    </aside>
  </div>;
}
