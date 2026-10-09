import React, {useEffect, useRef} from 'react';
import {Icon} from './icons';
import {trailPlayback} from './reading-history';
import './reading-history.css';

export function ReadingNavigation({graph, reading, onTravel}) {
  return <nav className="reading-navigation" aria-label="阅读导航">
    <button type="button" disabled={!reading.back} aria-label="上一篇" aria-keyshortcuts="ArrowLeft" title={reading.back ? `上一篇：${graph.index.get(reading.back)?.title}` : '没有上一篇'} onClick={() => onTravel(-1)}><Icon name="back" size={15}/></button>
    <button type="button" disabled={!reading.forward} aria-label="下一篇" aria-keyshortcuts="ArrowRight" title={reading.forward ? `下一篇：${graph.index.get(reading.forward)?.title}` : '没有下一篇'} onClick={() => onTravel(1)}><Icon name="chevron" size={15}/></button>
  </nav>;
}

export function ReadingHistoryToggle({open, onToggle, toggleRef}) {
  return <button ref={toggleRef} type="button" className="reading-history-toggle" aria-label="最近阅读" title="最近阅读" aria-expanded={open} aria-controls={open ? 'reading-history' : undefined} onClick={onToggle}>最近阅读</button>;
}

function trailPath(edge, nodes) {
  const a = nodes.get(edge.from), b = nodes.get(edge.to);
  if (!a || !b) return '';
  const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy);
  if (length < 32) return '';
  const ux = dx / length, uy = dy / length, bend = Math.min(38, length * .14);
  return `M${a.x + ux * 14},${a.y + uy * 14} Q${(a.x + b.x) / 2 - uy * bend},${(a.y + b.y) / 2 + ux * bend} ${b.x - ux * 18},${b.y - uy * 18}`;
}

// Read the live projected paths each frame so the travelling light stays attached
// while the camera moves. An open history keeps its old paths and only animates
// the latest hop; closing and reopening starts a fresh full-route playback.
export function ReadingTrail({projection, route, reduced, hidden}) {
  const svg = useRef(null), previousKeys = useRef(null);
  const segments = route?.segments || [];
  const timelineKey = JSON.stringify(segments.map(s => s.key));
  useEffect(() => {
    const element = svg.current;
    if (!element || hidden) return;
    const initial = previousKeys.current === null;
    const {play, settled} = trailPlayback(segments, previousKeys.current);
    previousKeys.current = segments.map(segment => segment.key);
    if (reduced || !play.length) return;
    element.classList.add('is-playing');
    const reveal = element.querySelector('.reading-trail-reveal');
    const head = element.querySelector('.reading-trail-head');
    const ripple = element.querySelector('.reading-trail-ripple');
    let raf, previous = 0, elapsed = initial ? -450 : 0;
    const duration = Math.max(140, Math.min(550, 5500 / play.length));
    const edgeKey = edge => JSON.stringify([edge.from, edge.to]);
    const settledEdges = settled.map(edgeKey);
    const tick = now => {
      const dt = previous ? Math.min(80, now - previous) : 0;
      previous = now;
      if (!document.hidden) elapsed += dt;
      const progress = Math.max(0, elapsed) / duration;
      const completed = Math.min(play.length, Math.floor(progress));
      const seen = new Set([...settledEdges, ...play.slice(0, completed).map(edgeKey)]);
      element.querySelectorAll('.reading-trail-edge').forEach(path => {
        path.style.opacity = seen.has(path.dataset.edge) ? '1' : '0';
      });
      const guides = new Map([...element.querySelectorAll('[data-segment]')].map(path => [path.dataset.segment, path]));
      const guide = guides.get(play[completed]?.key);
      const length = guide?.getAttribute('d') ? guide.getTotalLength() : 0;
      reveal.style.opacity = head.style.opacity = elapsed >= 0 && length > 0 ? '1' : '0';
      if (length > 0) {
        const t = progress - completed;
        reveal.setAttribute('d', guide.getAttribute('d'));
        reveal.style.strokeDashoffset = 1 - t;
        const point = guide.getPointAtLength(length * t);
        head.setAttribute('cx', point.x); head.setAttribute('cy', point.y);
      }
      const arrived = guides.get(play[completed - 1]?.key);
      const arrivalLength = arrived?.getAttribute('d') ? arrived.getTotalLength() : 0;
      const age = completed === play.length ? elapsed - play.length * duration : (progress - completed) * duration;
      const fade = Math.min(1, age / 550);
      ripple.style.opacity = arrivalLength > 0 ? (1 - fade) * .8 : 0;
      if (arrivalLength > 0) {
        const point = arrived.getPointAtLength(arrivalLength);
        ripple.setAttribute('cx', point.x); ripple.setAttribute('cy', point.y);
        ripple.setAttribute('r', 6 + fade * 16);
      }
      if (elapsed < play.length * duration + 550) raf = requestAnimationFrame(tick);
      else element.classList.remove('is-playing');
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf); element.classList.remove('is-playing');
      element.querySelectorAll('.reading-trail-edge').forEach(path => path.style.removeProperty('opacity'));
    };
  }, [timelineKey, reduced, hidden]);
  const nodes = new Map(projection.nodes.map(n => [n.id, n]));
  return <svg ref={svg} className="reading-trail" aria-hidden="true" style={{visibility: hidden ? 'hidden' : undefined}}>
    <defs>
      <marker id="reading-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 1 1 L 9 5 L 1 9"/></marker>
      {segments.map(segment => <path key={segment.key} data-segment={segment.key} d={trailPath(segment, nodes)}/>)}
    </defs>
    {(route?.edges || []).map(edge => <path key={JSON.stringify([edge.from,edge.to])} data-edge={JSON.stringify([edge.from,edge.to])} className="reading-trail-edge" d={trailPath(edge,nodes)} markerEnd="url(#reading-arrow)"/>)}
    <path className="reading-trail-reveal" pathLength="1"/>
    <circle className="reading-trail-head" r="2.8"/>
    <circle className="reading-trail-ripple" r="6"/>
    {projection.nodes.map(node => <g key={node.id} transform={`translate(${node.x},${node.y})`} className={node.current ? 'is-current' : ''}>
      <circle r="11"/><text x="0" y="-18" textAnchor="middle">{node.steps.join('·')}</text>
    </g>)}
  </svg>;
}
