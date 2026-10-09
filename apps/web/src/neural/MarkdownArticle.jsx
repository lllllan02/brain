import React, {memo, useEffect, useRef} from 'react';
import {renderDiagrams} from './diagrams';
import './diagrams.css';

export const MarkdownArticle = memo(function MarkdownArticle({html}) {
  const ref = useRef(null);
  useEffect(() => {
    const rendering = renderDiagrams(ref.current);
    return () => rendering.cancel();
  }, [html]);
  return <article className="markdown" ref={ref} dangerouslySetInnerHTML={{__html: html}}/>;
});
