import React, {memo, useEffect, useRef} from 'react';
import {renderDiagrams} from './diagrams';
import './diagrams.css';
import {decorateExternalLinks} from './external-links';

export const MarkdownArticle = memo(function MarkdownArticle({html}) {
  const ref = useRef(null);
  useEffect(() => {
    decorateExternalLinks(ref.current, import.meta.env.BASE_URL);
    const rendering = renderDiagrams(ref.current);
    return () => rendering.cancel();
  }, [html]);
  return <article className="markdown" ref={ref} dangerouslySetInnerHTML={{__html: html}}/>;
});
