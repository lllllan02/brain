import React, {useEffect, useRef} from 'react';
import {Icon} from './icons';
import {trailPlayback, trailPath} from './reading-history';
import './reading-history.css';
import {beamEnvelope} from '../motion/reading-flow.js';

export function ReadingNavigation({graph, reading, onTravel}) {
  return <nav className="reading-navigation" aria-label="阅读导航">
    <button type="button" disabled={!reading.back} aria-label="上一篇" aria-keyshortcuts="ArrowLeft" title={reading.back ? `上一篇：${graph.index.get(reading.back)?.title}` : '没有上一篇'} onClick={() => onTravel(-1)}><Icon name="back" size={15}/></button>
    <button type="button" disabled={!reading.forward} aria-label="下一篇" aria-keyshortcuts="ArrowRight" title={reading.forward ? `下一篇：${graph.index.get(reading.forward)?.title}` : '没有下一篇'} onClick={() => onTravel(1)}><Icon name="chevron" size={15}/></button>
  </nav>;
}

export function ReadingHistoryToggle({open, onToggle, toggleRef, label = '最近阅读', icon = 'history', controls = 'reading-history'}) {
  return <button ref={toggleRef} type="button" className="reading-history-toggle" aria-label={label} title={label} aria-expanded={open} aria-controls={open ? controls : undefined} onClick={onToggle}><Icon name={icon} size={15}/><span>{label}</span></button>;
}

// Read the live projected paths each frame so the travelling light stays attached
// while the camera moves. An open history keeps its old paths and only animates
// the latest hop; closing and reopening starts a fresh full-route playback.
// A small shared pool of lights takes turns across the recorded route after reveal.
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
    const duration = Math.max(260, Math.min(700, 7000 / play.length));
    const ease = t => t * t * (3 - 2 * t);
    const edgeKey = edge => JSON.stringify([edge.from, edge.to]);
    const settledEdges = settled.map(edgeKey);
    const tick = now => {
      const dt = previous ? Math.min(80, now - previous) : 0;
      previous = now;
      if (!document.hidden) elapsed += dt;
      const progress = Math.max(0, elapsed) / duration;
      const completed = Math.min(play.length, Math.floor(progress));
      const seen = new Set([...settledEdges, ...play.slice(0, completed).map(edgeKey)]);
      const activeEdge = play[completed] && edgeKey(play[completed]);
      const handoff = ease(Math.min(1, Math.max(0, (progress - completed - .7) / .3)));
      element.querySelectorAll('.reading-trail-edge').forEach(path => {
        path.style.opacity = seen.has(path.dataset.edge) ? '1' : path.dataset.edge === activeEdge ? String(handoff) : '0';
      });
      const guides = new Map([...element.querySelectorAll('[data-segment]')].map(path => [path.dataset.segment, path]));
      const guide = guides.get(play[completed]?.key);
      const length = guide?.getAttribute('d') ? guide.getTotalLength() : 0;
      reveal.style.opacity = head.style.opacity = '0';
      if (length > 0) {
        const phase = progress - completed;
        const t = ease(phase);
        reveal.style.opacity = elapsed >= 0 ? .55 * (1 - handoff) : 0;
        head.style.opacity = elapsed >= 0 ? Math.sin(Math.PI * phase) * .8 : 0;
        reveal.setAttribute('d', guide.getAttribute('d'));
        reveal.style.strokeDashoffset = 1 - t;
        const point = guide.getPointAtLength(length * t);
        head.setAttribute('cx', point.x); head.setAttribute('cy', point.y);
      }
      const arrived = guides.get(play[completed - 1]?.key);
      const arrivalLength = arrived?.getAttribute('d') ? arrived.getTotalLength() : 0;
      const age = completed === play.length ? elapsed - play.length * duration : (progress - completed) * duration;
      const fade = Math.min(1, age / 1000);
      ripple.style.opacity = arrivalLength > 0 ? Math.sin(Math.PI * fade) * .4 : 0;
      if (arrivalLength > 0) {
        const point = arrived.getPointAtLength(arrivalLength);
        ripple.setAttribute('cx', point.x); ripple.setAttribute('cy', point.y);
        ripple.setAttribute('r', 8 + ease(fade) * 13);
      }
      if (elapsed < play.length * duration + 1000) raf = requestAnimationFrame(tick);
      else element.classList.remove('is-playing');
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf); element.classList.remove('is-playing');
      element.querySelectorAll('.reading-trail-edge').forEach(path => path.style.removeProperty('opacity'));
    };
  }, [timelineKey, reduced, hidden]);
  // Reuse at most two beams, even for long histories. Read the live guide each
  // frame so camera movement never detaches a beam from its stars.
  const beamCount = segments.length ? (segments.length < 6 ? 1 : 2) : 0;
  useEffect(() => {
    const element = svg.current;
    if (!element || reduced || hidden || !beamCount) return;
    const beams = [...element.querySelectorAll('.reading-trail-shared-beam')];
    let raf, previous = 0, elapsed = 0;
    const tick = now => {
      const dt = previous ? Math.min(80, now - previous) : 0;
      previous = now;
      // Let the opening trace finish before starting ambient traffic.
      if (!element.classList.contains('is-playing')) elapsed += dt;
      const guides = element.querySelectorAll('[data-segment]');
      beams.forEach((beam, index) => {
        const clock = elapsed - index * 625;
        beam.style.opacity = '0';
        if (clock < 0 || element.classList.contains('is-playing')) return;
        const hop = Math.floor(clock / 1250);
        const phase = (clock % 1250) / 1100;
        if (phase >= 1) return; // A short quiet beat before the next departure.
        const guide = guides[(hop * beamCount + index) % guides.length];
        const path = guide?.getAttribute('d');
        if (!path) return;
        const {tail, offset, opacity} = beamEnvelope(phase);
        beam.style.opacity = String(opacity);
        beam.querySelectorAll('path').forEach(light => {
          light.setAttribute('d', path);
          light.style.strokeDasharray = `${tail} 2`;
          light.style.strokeDashoffset = String(offset);
        });
      });
      raf = requestAnimationFrame(tick);
    };
    const resume = () => {
      cancelAnimationFrame(raf);
      previous = 0;
      if (!document.hidden) raf = requestAnimationFrame(tick);
    };
    document.addEventListener('visibilitychange', resume);
    resume();
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', resume);
      beams.forEach(beam => {beam.style.opacity = '0';});
    };
  }, [timelineKey, reduced, hidden, beamCount]);
  const nodes = new Map(projection.nodes.map(n => [n.id, n]));
  return <svg ref={svg} className={`reading-trail${reduced ? ' is-reduced' : ''}`} aria-hidden="true" style={{visibility: hidden ? 'hidden' : undefined}}>
    <defs>
      <radialGradient id="reading-glow">
        <stop offset="0" stopColor="#dceafa" stopOpacity=".65"/>
        <stop offset=".3" stopColor="#9bb9d7" stopOpacity=".3"/>
        <stop offset="1" stopColor="#9bb9d7" stopOpacity="0"/>
      </radialGradient>
      {segments.map(segment => <path key={segment.key} data-segment={segment.key} d={trailPath(segment, nodes)}/>)}
    </defs>
    {(route?.edges || []).map(edge => {
      const path = trailPath(edge, nodes);
      return <g key={JSON.stringify([edge.from, edge.to])} data-edge={JSON.stringify([edge.from, edge.to])} className="reading-trail-edge">
        <path className="reading-trail-halo" d={path}/>
        <path className="reading-trail-thread" d={path}/>
      </g>;
    })}
    {Array.from({length: beamCount}, (_, index) => <g key={index} className="reading-trail-shared-beam">
      <path className="reading-trail-flow-aura" pathLength="1"/>
      <path className="reading-trail-flow-core" pathLength="1"/>
    </g>)}
    <path className="reading-trail-reveal" pathLength="1"/>
    <circle className="reading-trail-head" r="1.8"/>
    <circle className="reading-trail-ripple" r="6"/>
    {projection.nodes.map(node => <g key={node.id} transform={`translate(${node.x},${node.y})`} className={node.current ? 'is-current' : ''}>
      <circle className="reading-trail-glow" r="15"/><text x="0" y="-18" textAnchor="middle">{node.steps.join('·')}</text>
    </g>)}
  </svg>;
}
