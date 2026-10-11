import React, {memo, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {ReadingQueueButton} from './ReadingQueueButton';
import {renderDiagrams} from './diagrams';
import './diagrams.css';
import {decorateExternalLinks} from './external-links';

export const MarkdownArticle = memo(function MarkdownArticle({html, graph, queue}) {
  const ref = useRef(null);
  const [queueTargets, setQueueTargets] = useState([]);
  const queueEnabled = Boolean(queue && graph);
  useLayoutEffect(() => {
    if (!queueEnabled) { setQueueTargets([]); return; }
    const targets = [];
    for (const anchor of ref.current.querySelectorAll('a[href]')) {
      const match = /^#\/doc\/([^/]+)(?:\/[^/]+)?$/.exec(anchor.getAttribute('href'));
      if (!match) continue;
      let node;
      try { node = graph.index.get(decodeURIComponent(match[1])); }
      catch { continue; }
      if (!node?.module) continue;
      // Keep the button outside the link so adding a document never navigates.
      const host = document.createElement('span');
      host.className = 'inline-queue-action';
      host.style.setProperty('--link-color', anchor.style.getPropertyValue('--link-color'));
      anchor.after(host);
      targets.push({host, node});
    }
    setQueueTargets(targets);
    return () => targets.forEach(({host}) => host.remove());
  }, [html, graph, queueEnabled]);
  useEffect(() => {
    decorateExternalLinks(ref.current, import.meta.env.BASE_URL);
    const rendering = renderDiagrams(ref.current);
    return () => rendering.cancel();
  }, [html]);
  return <><article className="markdown" ref={ref} dangerouslySetInnerHTML={{__html: html}}/>
    {queue && queueTargets.map(({host, node}, index) => createPortal(
      <ReadingQueueButton queue={queue} node={node} className="inline-queue-button"/>, host, index))}
  </>;
});
