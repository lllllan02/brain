import { CodeAssetPreview } from './CodeAssetPreview.tsx';
import React, { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { type ViewerImage, ImageViewer, imageForViewer } from './ImageViewer.tsx';
import { renderDiagrams } from './diagrams.ts';
import './diagrams.css';
import { createArticlePatcher } from './patch-article.ts';
import { decorateExternalLinks } from './external-links.ts';

export const MarkdownArticle = memo(function MarkdownArticle({
  html,
  zoomable = false,
}: {
  html: string;
  zoomable?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const patch = useRef<ReturnType<typeof createArticlePatcher> | null>(null);
  useLayoutEffect(() => {
    patch.current ??= createArticlePatcher(ref.current!);
    patch.current(html);
  }, [html]);
  const [image, setImage] = useState<ViewerImage | null>(null);
  useEffect(() => {
    decorateExternalLinks(ref.current!, import.meta.env.BASE_URL);
    const rendering = renderDiagrams(ref.current!);
    let cancelled = false;
    const decorate = () => {
      if (!zoomable || cancelled) return;
      ref
        .current!.querySelectorAll<HTMLElement>('img, .diagram-canvas:not([hidden])')
        .forEach((element) => {
          element.dataset.imageViewer = '';
          element.tabIndex = 0;
          element.setAttribute('role', 'button');
          element.setAttribute('aria-label', `放大查看：${element.getAttribute('alt') || '图表'}`);
          element.title = '点击放大查看';
        });
    };
    decorate();
    rendering.ready.then(decorate);
    return () => {
      cancelled = true;
      rendering.cancel();
    };
  }, [html, zoomable]);
  const open = (event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => {
    const target = (event.target as Element).closest<HTMLElement>('[data-image-viewer]');
    if (!zoomable || !target) return;
    if (event.type === 'keydown' && !['Enter', ' '].includes((event as React.KeyboardEvent).key))
      return;
    event.preventDefault();
    event.stopPropagation();
    setImage(imageForViewer(target));
  };
  return (
    <>
      <article className="markdown" ref={ref} onClick={open} onKeyDown={open} />
      <CodeAssetPreview root={ref} html={html} />
      {image && <ImageViewer image={image} onClose={() => setImage(null)} />}
    </>
  );
});
