import React, {memo, useEffect, useRef, useState} from 'react';
import {ImageViewer, imageForViewer} from './ImageViewer';
import {renderDiagrams} from './diagrams';
import './diagrams.css';
import {decorateExternalLinks} from './external-links';

export const MarkdownArticle = memo(function MarkdownArticle({html, zoomable = false}) {
  const ref = useRef(null);
  const [image, setImage] = useState(null);
  useEffect(() => {
    setImage(null);
    decorateExternalLinks(ref.current, import.meta.env.BASE_URL);
    const rendering = renderDiagrams(ref.current);
    let cancelled = false;
    const decorate = () => {
      if (!zoomable || cancelled) return;
      ref.current.querySelectorAll('img, .diagram-canvas:not([hidden])').forEach(element => {
        element.dataset.imageViewer = '';
        element.tabIndex = 0;
        element.setAttribute('role', 'button');
        element.setAttribute('aria-label', `放大查看：${element.alt || '图表'}`);
        element.title = '点击放大查看';
      });
    };
    decorate();
    rendering.ready.then(decorate);
    return () => {cancelled = true; rendering.cancel();};
  }, [html, zoomable]);
  const open = event => {
    const target = event.target.closest('[data-image-viewer]');
    if (!zoomable || !target) return;
    if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    setImage(imageForViewer(target));
  };
  return <><article className="markdown" ref={ref} onClick={open} onKeyDown={open} dangerouslySetInnerHTML={{__html: html}}/>{image && <ImageViewer image={image} onClose={() => setImage(null)}/>}</>;
});
