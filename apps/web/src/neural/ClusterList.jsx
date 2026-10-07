import React, {useEffect, useMemo, useRef, useState} from 'react';

export function clusterDocuments(graph, cluster) {
  if (!cluster) return [];
  return graph.nodes.filter(node => node.module && (cluster.tag
    ? node.tags?.includes(cluster.tag)
    : node.module === cluster.category))
    .sort((a, b) => a.title.localeCompare(b.title, 'zh-CN') || a.id.localeCompare(b.id));
}

export function ClusterList({graph, cluster, selected, onSelect, onClose, getAnchor, reduced, onPresenceChange}) {
  const scroll = useRef(null), layer = useRef(null), svg = useRef(null);
  const shownRef = useRef(null), lastAnchor = useRef(null);
  const [shown, setShown] = useState(null), [phase, setPhase] = useState('open');
  const documents = useMemo(() => clusterDocuments(graph, shown), [graph, shown]);
  const kind = shown?.tag ? '标签' : '分类';
  const title = shown?.tag || graph.modules.find(item => item.id === shown?.category)?.title || '未分类';
  const selectionKey = shown?.tag ? `tag:${shown.tag}` : `category:${shown?.category}`;

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
    } else if (shownRef.current && (shownRef.current.category !== cluster.category || shownRef.current.tag !== cluster.tag)) {
      setPhase('closing');
      timer = setTimeout(show, reduced ? 0 : 220);
    } else show();
    return () => clearTimeout(timer);
  }, [cluster?.category, cluster?.tag, reduced, onPresenceChange]);

  useEffect(() => {
    if (!shown || !scroll.current) return;
    scroll.current.scrollTop = 0;
    scroll.current.focus({preventScroll: true});
  }, [selectionKey]);

  useEffect(() => {
    if (!shown || !layer.current) return;
    let raf, previous = 0;
    // SVG connects the projected cluster center to only the currently visible
    // document ports. Scrolling never creates hidden lines outside the list.
    const update = now => {
      raf = requestAnimationFrame(update);
      if (document.hidden || now - previous < 25) return;
      previous = now;
      const box = layer.current.getBoundingClientRect();
      const viewport = scroll.current.getBoundingClientRect();
      const projected = getAnchor?.();
      if (projected) lastAnchor.current = projected;
      const anchor = lastAnchor.current || {x:viewport.left - 160, y:(viewport.top + viewport.bottom) / 2};
      const startX = anchor.x - box.left, startY = anchor.y - box.top;
      const rows = scroll.current.querySelectorAll('.cluster-list-item');
      const paths = svg.current.querySelectorAll('path');
      rows.forEach((row, i) => {
        const port = row.querySelector('.cluster-card-port').getBoundingClientRect();
        const endY = port.top + port.height / 2, visible = endY > viewport.top + 3 && endY < viewport.bottom - 3;
        const path = paths[i];
        if (!path) return;
        path.style.visibility = visible ? 'visible' : 'hidden';
        if (!visible) return;
        const endX = port.left + port.width / 2 - box.left, targetY = endY - box.top;
        const span = Math.max(28, (endX - startX) * .52);
        path.setAttribute('d', `M ${startX} ${startY} C ${startX + span} ${startY}, ${endX - span * .65} ${targetY}, ${endX} ${targetY}`);
      });
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [shown, documents, getAnchor]);

  if (!shown) return null;
  return <div ref={layer} className={`cluster-fan is-${phase}`} inert={phase === 'closing'}>
    <svg ref={svg} className="cluster-fan-lines" aria-hidden="true" key={`lines:${selectionKey}`}>
      {documents.map((node, index) => <path key={node.id} pathLength="1" className={node.id === selected ? 'is-current' : ''}
        style={{'--fan-delay': `${Math.min(index, 8) * 38}ms`}}/>)}
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
        </li>)}</ul> : <p className="cluster-list-empty">暂时没有匹配的文档</p>}
      </div>
    </aside>
  </div>;
}
