import {readViewState, writeViewState} from './view-state';
import {Icon} from './icons';
import {collectionLabel, collectionMarkerStyle} from '../collections.js';
import React, {useEffect, useLayoutEffect, useMemo, useRef} from 'react';

import {readingFlow, READING_FLOW, READING_INK, readingInkVariables, launchAccent, launchWake} from '../motion/reading-flow.js';

import {usePresence} from '../motion/usePresence';
import {MOTION, smooth, stagger} from '../motion/tokens.js';

const clusterKey = cluster => !cluster ? null : cluster.latest ? 'latest' : cluster.recent ? 'recent' : cluster.document ? `document:${cluster.document}:${cluster.direction || 'outgoing'}` : cluster.tag ? `tag:${cluster.tag}` : `category:${cluster.category}`;

export function clusterDocuments(graph, cluster) {
  if (!cluster) return [];
  if (cluster.latest) return cluster.latest.map(item => graph.index.get(item.id)).filter(node => node?.module);
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
    : cluster.category?.startsWith('collection:') ? node.collection === cluster.category.slice(11) : node.module === cluster.category))
    .sort((a, b) => a.title.localeCompare(b.title, 'zh-CN') || a.id.localeCompare(b.id));
}

export function ClusterList({graph, cluster, selected, anchorId = selected, onSelect, onClose, onClear, getAnchor, reduced, onPresenceChange, navigation}) {
  const scroll = useRef(null), svg = useRef(null), origin = useRef(selected);
  const {shown, ref: layer, closing} = usePresence(cluster, clusterKey(cluster), reduced, 'translateX(-12px)');
  if (!closing && anchorId) origin.current = anchorId;
  const documents = useMemo(() => clusterDocuments(graph, shown), [graph, shown]);
  const timeline = Boolean(shown?.recent || shown?.latest);
  const collection = shown?.category?.startsWith('collection:') ? shown.category.slice(11) : null;
  const kind = timeline ? '' : shown?.document ? shown.direction === 'incoming' ? '被引用' : '内部链接' : shown?.tag ? '标签' : collection ? '目录' : '分类';
  const title = shown?.latest ? '最新文档' : shown?.recent ? '最近阅读' : shown?.document ? graph.index.get(shown.document)?.title || '文档' : collection ? collectionLabel(collection) : shown?.tag || graph.modules.find(item => item.id === shown?.category)?.title || '未分类';
  const selectionKey = clusterKey(shown);
  useEffect(() => { onPresenceChange(Boolean(shown)); }, [Boolean(shown), onPresenceChange]);

  useEffect(() => {
    if (!shown || !scroll.current) return;
    // The track height is established in the layout effect below.
    scroll.current.scrollTop = readViewState(`listScroll:${selectionKey}`, 0, value => Number.isFinite(value) && value >= 0);
    // Automatically opened references should not move focus away from the reader.
    if (!shown.document && !timeline) scroll.current.focus({preventScroll: true});
  }, [selectionKey]);

  useLayoutEffect(() => {
    if (!shown || !layer.current) return;
    let raf, previous = 0, elapsed = 0, source = null, sourceId = origin.current, sourceTween = null;
    const scroller = scroll.current;
    const track = scroller.querySelector('.cluster-scroll-track');
    const content = scroller.querySelector('.cluster-scroll-content');
    let appliedOffset = 0;
    content.style.transform = 'translateY(0px)';
    const size = () => {
      track.style.height = `${Math.max(content.offsetHeight, scroller.clientHeight)}px`;
      scroller.style.setProperty('--cluster-viewport-height', `${scroller.clientHeight}px`);
    };
    size();
    scroller.scrollTop = readViewState(`listScroll:${selectionKey}`, 0, value => Number.isFinite(value) && value >= 0);
    const paths = svg.current.querySelectorAll('.cluster-thread');
    const sparks = svg.current.querySelectorAll('.cluster-thread-sparks');
    const rows = Array.from(scroller.querySelectorAll('.cluster-list-item'), (row, i) => ({
      row, port: row.querySelector('.cluster-card-port'), path: paths[i], glow: sparks[i],
      beams: sparks[i]?.querySelectorAll('.cluster-flow-beam'),
      wake: sparks[i]?.querySelector('.cluster-flow-wake'),
      ripples: sparks[i]?.querySelectorAll('.cluster-flow-ripple'),
    }));
    // SVG connects the current reading node to only the currently visible
    // document ports. Scrolling never creates hidden lines outside the list.
    const update = now => {
      if (!layer.current || !scroll.current || !svg.current) return;
      if (document.hidden) { previous = 0; return; }
      const dt = previous ? Math.max(0, Math.min(now - previous, MOTION.maxFrame)) : 0;
      elapsed += dt;
      previous = Math.max(previous, now);
      const box = layer.current.getBoundingClientRect();
      const viewport = scroll.current.getBoundingClientRect();
      const anchor = getAnchor?.(origin.current);
      // Elastic overscroll can report negative or beyond-bottom values. Both
      // cards and lines stop at the same content boundary, including short lists.
      const maxOffset = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      const offset = Math.max(0, Math.min(scroller.scrollTop, maxOffset));
      const scrollDelta = offset - appliedOffset;
      // Read all ports before writing SVG styles to avoid per-row layout flushes.
      const ports = rows.map(({port}) => port.getBoundingClientRect());
      // Native scrolling moves only the track. Its sticky viewport stays put;
      // cards and SVG endpoints consume this single offset in the same paint.
      content.style.transform = `translateY(${-offset}px)`;
      appliedOffset = offset;
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
      const visibleRows = ports.map((port, i) => ({i, y: port.top + port.height / 2 - scrollDelta}))
        .filter(({y}) => y > viewport.top + 3 && y < viewport.bottom - 3);
      const time = anchor.flowTime ?? elapsed / 1000;
      const accent = launchAccent(time);
      const hub = svg.current.querySelector('.cluster-flow-hub');
      if (hub) {
        hub.setAttribute('transform', `translate(${startX} ${startY})`);
        hub.style.opacity = visibleRows.length ? smooth((elapsed - MOTION.enter) / MOTION.enter) : 0;
        const charge = hub.querySelector('circle'), wave = hub.querySelector('ellipse');
        charge.setAttribute('r', 4 + accent.charge * 6);
        charge.style.opacity = accent.charge * .55 + accent.flash * .75;
        wave.setAttribute('rx', 6 + (1 - (1 - accent.wave) ** 2) * 32);
        wave.setAttribute('ry', 3 + accent.wave * 13);
        wave.style.opacity = accent.flash * .5;
      }
      rows.forEach(({row, path, glow, beams, wake, ripples}, i) => {
        const port = ports[i];
        const endY = port.top + port.height / 2 - scrollDelta;
        if (!path) return;
        // Visibility is spatial: a port outside the viewport loses its line in
        // the same update, with no time-based fade trailing behind scrolling.
        const visible = endY > viewport.top + 3 && endY < viewport.bottom - 3;
        const alpha = visible ? Math.max(0, Math.min(1, (endY - viewport.top) / 18, (viewport.bottom - endY) / 18)) : 0;
        path.style.strokeOpacity = alpha * READING_INK.opacity;
        if (glow) glow.style.opacity = alpha;
        if (!visible) return;
        const endX = port.left + port.width / 2 - box.left, targetY = endY - box.top;
        const span = Math.max(28, (endX - startX) * .52);
        path.setAttribute('d', `M ${startX} ${startY} C ${startX + span} ${startY}, ${endX - span * .65} ${targetY}, ${endX} ${targetY}`);
        if (glow) {
          const reveal = smooth((elapsed - MOTION.enter - stagger(i)) / MOTION.enter);
          const rank = visibleRows.findIndex(item => item.i === i);
          const flow = readingFlow(time, rank, visibleRows.length, true);
          const residual = launchWake(time);
          wake.setAttribute('d', path.getAttribute('d'));
          wake.style.strokeDasharray = `${residual.length} 2`;
          wake.style.opacity = flow.active ? residual.opacity * reveal : 0;
          beams.forEach(beam => {
            beam.setAttribute('d', path.getAttribute('d'));
            beam.style.strokeDasharray = `${flow.tail} 2`;
            beam.style.strokeDashoffset = String(flow.offset);
            beam.style.opacity = flow.active ? flow.opacity * reveal : 0;
          });
          // One diffuse arrival at the card, using the same palette as history.
          const age = time % READING_FLOW.period - READING_FLOW.handoff - READING_FLOW.launch;
          const ripple = ripples[0], progress = Math.max(0, Math.min(1, age / READING_FLOW.arrival));
          ripple.setAttribute('cx', endX); ripple.setAttribute('cy', targetY);
          ripple.setAttribute('r', 3 + (1 - (1 - progress) ** 2) * 10);
          ripple.setAttribute('opacity', flow.active && age >= 0 ? (1 - progress) ** 2 * reveal * .45 : 0);
        }
      });
    };
    const tick = now => {
      update(now);
      raf = requestAnimationFrame(tick);
    };
    // Scroll events run before animation-frame callbacks. Update immediately so
    // scrollbar dragging and wheel/touch scrolling share the same geometry.
    const onScroll = () => {
      writeViewState(`listScroll:${selectionKey}`, scroller.scrollTop);
      update(performance.now());
    };
    const resize = new ResizeObserver(() => { size(); update(performance.now()); });
    resize.observe(scroller);
    resize.observe(content);
    // Focus reveal must use content coordinates, since the visible rows are
    // translated inside a pinned viewport rather than natively scrolled.
    const onFocus = event => {
      const row = event.target.closest('.cluster-list-item');
      if (!row) return;
      const item = row.closest('li');
      const top = item.offsetTop, bottom = top + item.offsetHeight;
      if (top < scroller.scrollTop) scroller.scrollTop = top;
      else if (bottom > scroller.scrollTop + scroller.clientHeight) scroller.scrollTop = bottom - scroller.clientHeight;
      update(performance.now());
    };
    scroller.addEventListener('focusin', onFocus);
    scroller.addEventListener('scroll', onScroll, {passive: true});
    update(performance.now());
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      scroller.removeEventListener('scroll', onScroll);
      scroller.removeEventListener('focusin', onFocus);
      resize.disconnect();
    };
  }, [selectionKey, documents, getAnchor, reduced]);

  if (!shown) return navigation ? <div className="cluster-fan"><aside className="cluster-list cluster-list-collapsed" aria-label="文档列表导航"><div className="cluster-list-navigation">{navigation}</div></aside></div> : null;
  return <div ref={layer} className={`cluster-fan${closing ? ' is-closing' : ''}`} inert={closing}>
    <svg ref={svg} className="cluster-fan-lines" style={readingInkVariables} aria-hidden="true" key={`lines:${selectionKey}`}>
      {!reduced && <g className="cluster-flow-hub"><circle r="4" opacity="0"/><ellipse rx="6" ry="3" opacity="0"/></g>}
      {documents.map((node, index) => <path key={node.id} pathLength="1" className={`cluster-thread${node.id === selected ? ' is-current' : ''}`}
        style={{'--fan-delay': `${stagger(index)}ms`}}/>)}
      {!reduced && documents.map(node => <g key={`sparks:${node.id}`} className="cluster-thread-sparks">
        <path className="cluster-flow-wake" pathLength="1"/>
        <circle className="cluster-flow-ripple" r="4" opacity="0"/>
        <path className="cluster-flow-beam reading-trail-flow-aura" pathLength="1"/>
        <path className="cluster-flow-beam reading-trail-flow-core" pathLength="1"/>
      </g>)}
    </svg>
    <aside id={shown.latest ? 'latest-documents' : shown.recent ? 'reading-history' : undefined} className={`cluster-list${timeline ? ' cluster-history' : ''}`} aria-label={timeline ? title : `${kind} ${title} 的文档列表`}>
      {navigation && <div className="cluster-list-navigation">{navigation}</div>}
      <header className="cluster-list-header"><div>{kind && <span>{kind}</span>}<h2>{title}</h2><small>{documents.length} 篇</small></div>
        <button type="button" onClick={onClose} aria-label={timeline ? `收起${title}` : '关闭文档列表'} title="关闭列表"><Icon name="close" size={16}/></button>
      </header>
      <div className="cluster-list-scroll" ref={scroll} tabIndex={0} role="region" aria-label={`${title}文档，可滚动浏览`}>
        <div className="cluster-scroll-track"><div className="cluster-scroll-viewport"><div className="cluster-scroll-content">
        {documents.length ? <ul key={selectionKey}>{documents.map((node, index) => <li key={node.id}>
          <button type="button" className="cluster-list-item" style={{'--fan-delay': `${stagger(index)}ms`}}
            aria-current={node.id === selected ? 'page' : undefined} onClick={() => onSelect(node.id)}>
            <i className="cluster-card-port" style={collectionMarkerStyle(node.collection)} aria-hidden="true"/>
            {timeline && <small className="cluster-history-index">{index + 1}</small>}
            <span><strong>{node.title}</strong></span>
            {timeline && node.id === selected && <small className="cluster-history-current">当前</small>}
          </button>
        </li>)}</ul> : <p className="cluster-list-empty">{shown.latest ? '暂无有有效日期的文档' : shown.recent ? '打开文档后，这里会留下阅读足迹' : shown.document ? shown.direction === 'incoming' ? '还没有其他文档引用这篇文章' : '这篇文章没有可打开的内部链接' : '暂时没有匹配的文档'}</p>}
        </div></div></div>
      </div>
      {shown.latest && <footer className="cluster-history-footer"><span>按更新时间 · 最近 10 篇</span></footer>}
      {shown.recent && <footer className="cluster-history-footer"><span>同篇去重 · 最多 50 篇</span><button type="button" onClick={onClear} disabled={!documents.length} title="清空最近阅读记录"><Icon name="trash" size={14}/>清空</button></footer>}
    </aside>
  </div>;
}
