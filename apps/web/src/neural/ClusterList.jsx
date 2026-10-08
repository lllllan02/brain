import React, {useEffect, useMemo, useRef, useState} from 'react';

export function clusterDocuments(graph, cluster) {
  if (!cluster) return [];
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

export function ClusterList({graph, cluster, selected, onSelect, onClose, getAnchor, reduced, onPresenceChange}) {
  const scroll = useRef(null), layer = useRef(null), svg = useRef(null);
  const shownRef = useRef(null);
  const [shown, setShown] = useState(null), [phase, setPhase] = useState('open');
  const documents = useMemo(() => clusterDocuments(graph, shown), [graph, shown]);
  const kind = shown?.document ? shown.direction === 'incoming' ? '被引用' : '内部链接' : shown?.tag ? '标签' : '分类';
  const title = shown?.document ? graph.index.get(shown.document)?.title || '文档' : shown?.tag || graph.modules.find(item => item.id === shown?.category)?.title || '未分类';
  const selectionKey = shown?.document ? `document:${shown.document}:${shown.direction || 'outgoing'}` : shown?.tag ? `tag:${shown.tag}` : `category:${shown?.category}`;

  // Keep the outgoing cards mounted long enough to fold back into their origin.
  // A new click cancels a pending exit so rapid changes always end on the latest choice.
  useEffect(() => {
    let timer;
    const show = () => {
      shownRef.current = cluster; setShown(cluster); setPhase('open');
      onPresenceChange(Boolean(cluster));
    };
    if (!cluster) {
      setPhase('closing');
      timer = setTimeout(show, reduced ? 0 : 380);
    } else if (shownRef.current && (shownRef.current.category !== cluster.category || shownRef.current.tag !== cluster.tag || shownRef.current.document !== cluster.document || shownRef.current.direction !== cluster.direction)) {
      setPhase('closing');
      timer = setTimeout(show, reduced ? 0 : 220);
    } else show();
    return () => clearTimeout(timer);
  }, [cluster?.category, cluster?.tag, cluster?.document, cluster?.direction, reduced, onPresenceChange]);

  useEffect(() => {
    if (!shown || !scroll.current) return;
    scroll.current.scrollTop = 0;
    // Automatically opened references should not move focus away from the reader.
    if (!shown.document) scroll.current.focus({preventScroll: true});
  }, [selectionKey]);

  useEffect(() => {
    if (!shown || !layer.current) return;
    let raf, previous = 0, elapsed = 0;
    // SVG connects the current reading node to only the currently visible
    // document ports. Scrolling never creates hidden lines outside the list.
    const update = now => {
      raf = requestAnimationFrame(update);
      if (document.hidden) { previous = now; return; }
      if (now - previous < 25) return;
      elapsed += previous ? Math.min(now - previous, 64) : 0;
      previous = now;
      const box = layer.current.getBoundingClientRect();
      const viewport = scroll.current.getBoundingClientRect();
      const anchor = getAnchor?.();
      // Never draw from an invented or stale origin while a node is unavailable.
      svg.current.style.display = anchor ? '' : 'none';
      if (!anchor) return;
      const startX = anchor.x - box.left, startY = anchor.y - box.top;
      const rows = scroll.current.querySelectorAll('.cluster-list-item');
      const paths = svg.current.querySelectorAll('path');
      const sparks = svg.current.querySelectorAll('.cluster-thread-sparks');
      rows.forEach((row, i) => {
        const port = row.querySelector('.cluster-card-port').getBoundingClientRect();
        const endY = port.top + port.height / 2, visible = endY > viewport.top + 3 && endY < viewport.bottom - 3;
        const path = paths[i];
        if (!path) return;
        path.style.visibility = visible ? 'visible' : 'hidden';
        const glow = sparks[i];
        if (glow) glow.style.visibility = visible ? 'visible' : 'hidden';
        if (!visible) return;
        const endX = port.left + port.width / 2 - box.left, targetY = endY - box.top;
        const span = Math.max(28, (endX - startX) * .52);
        path.setAttribute('d', `M ${startX} ${startY} C ${startX + span} ${startY}, ${endX - span * .65} ${targetY}, ${endX} ${targetY}`);
        if (glow) {
          const reveal = Math.min(1, Math.max(0, (elapsed - 800 - Math.min(i, 8) * 38) / 450));
          const ripples = glow.querySelectorAll('.cluster-flow-ripple');
          glow.querySelectorAll('.cluster-flow-dot').forEach((dot, j) => {
            const travel = elapsed / 4200 + (i * .19 + j * .5) % 1;
            const progressAlong = travel % 1;
            const incoming = shown.direction === 'incoming';
            const t = incoming ? 1 - progressAlong : progressAlong, inverse = 1 - t;
            // Sample the same cubic as the line, so sparks follow camera and list motion.
            const x = inverse ** 3 * startX + 3 * inverse ** 2 * t * (startX + span)
              + 3 * inverse * t ** 2 * (endX - span * .65) + t ** 3 * endX;
            const y = startY + (targetY - startY) * (3 * t ** 2 - 2 * t ** 3);
            const fade = Math.min(1, t / .12, (1 - t) / .18);
            dot.setAttribute('cx', x); dot.setAttribute('cy', y);
            dot.setAttribute('opacity', fade * reveal * (j ? .5 : .9));
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
  }, [shown, documents, getAnchor, reduced]);

  if (!shown) return null;
  return <div ref={layer} className={`cluster-fan is-${phase}`} inert={phase === 'closing'}>
    <svg ref={svg} className="cluster-fan-lines" aria-hidden="true" key={`lines:${selectionKey}`}>
      {documents.map((node, index) => <path key={node.id} pathLength="1" className={node.id === selected ? 'is-current' : ''}
        style={{'--fan-delay': `${Math.min(index, 8) * 38}ms`}}/>)}
      {!reduced && documents.map(node => <g key={`sparks:${node.id}`} className="cluster-thread-sparks">
        <circle className="cluster-flow-ripple" r="4" opacity="0"/><circle className="cluster-flow-ripple" r="4" opacity="0"/>
        <circle className="cluster-flow-dot" r="1.8" opacity="0"/><circle className="cluster-flow-dot" r="1.2" opacity="0"/>
      </g>)}
    </svg>
    <aside className="cluster-list" aria-label={`${kind} ${title} 的文档列表`}>
      <header className="cluster-list-header"><div><span>{kind}</span><h2>{title}</h2><small>{documents.length} 篇</small></div>
        <button type="button" onClick={onClose} aria-label="关闭文档列表" title="关闭列表">×</button>
      </header>
      <div className="cluster-list-scroll" ref={scroll} tabIndex={0} role="region" aria-label={`${title}文档，可滚动浏览`}>
        {documents.length ? <ul key={selectionKey}>{documents.map((node, index) => <li key={node.id}>
          <button type="button" className="cluster-list-item" style={{'--fan-delay': `${Math.min(index, 8) * 38}ms`}}
            aria-current={node.id === selected ? 'page' : undefined} onClick={() => onSelect(node.id)}>
            <i className="cluster-card-port" aria-hidden="true"/>
            <span><strong>{node.title}</strong></span>
          </button>
        </li>)}</ul> : <p className="cluster-list-empty">{shown.document ? shown.direction === 'incoming' ? '还没有其他文档引用这篇文章' : '这篇文章没有可打开的内部链接' : '暂时没有匹配的文档'}</p>}
      </div>
    </aside>
  </div>;
}
