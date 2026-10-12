export interface ViewerImage {
  src: string;
  alt: string;
  trigger: HTMLElement;
}
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './image-viewer.css';

export function ImageViewer({ image, onClose }: { image: ViewerImage; onClose(): void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [bounds, setBounds] = useState({ width: 1, height: 1 });
  const [zoom, setZoom] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const fit = size ? Math.min(bounds.width / size.width, bounds.height / size.height, 1) : 1;
  const scale = zoom ?? fit;

  useLayoutEffect(() => {
    const element = dialog.current!;
    element.showModal();
    const observer = new ResizeObserver(([entry]) =>
      setBounds({ width: entry.contentRect.width, height: entry.contentRect.height }),
    );
    observer.observe(viewport.current!);
    return () => {
      observer.disconnect();
      element.close();
      if (image.trigger.isConnected) image.trigger.focus({ preventScroll: true });
    };
  }, [image]);
  useEffect(() => {
    // Keep reader navigation and search shortcuts out of the modal.
    const key = (event: KeyboardEvent) => {
      event.stopPropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    const element = dialog.current!;
    element.addEventListener('keydown', key);
    return () => element.removeEventListener('keydown', key);
  }, [onClose]);

  return createPortal(
    <dialog
      ref={dialog}
      className="image-viewer"
      role="dialog"
      aria-label="图片放大查看"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="image-viewer-toolbar">
        <span className="image-viewer-title">{image.alt || '图片预览'}</span>
        <button
          type="button"
          disabled={!size || scale <= 0.1}
          aria-label="缩小图片"
          onClick={() => setZoom(Math.max(0.1, scale / 1.5))}
        >
          −
        </button>
        <output aria-live="polite">{Math.round(scale * 100)}%</output>
        <button
          type="button"
          disabled={!size || scale >= 8}
          aria-label="放大图片"
          onClick={() => setZoom(Math.min(8, scale * 1.5))}
        >
          ＋
        </button>
        <button type="button" onClick={() => setZoom(null)}>
          适应窗口
        </button>
        <button type="button" onClick={() => setZoom(1)}>
          原始大小
        </button>
        <button
          type="button"
          autoFocus
          aria-label="关闭图片预览"
          title="关闭（Esc）"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      <div
        className="image-viewer-viewport"
        ref={viewport}
        tabIndex={0}
        aria-label="图片，可滚动查看"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        {failed ? (
          <p role="status">图片加载失败，请关闭后重试。</p>
        ) : (
          <img
            src={image.src}
            alt={image.alt}
            draggable="false"
            style={
              size
                ? { width: size.width * scale, height: size.height * scale }
                : { maxWidth: '100%' }
            }
            onLoad={(event) =>
              setSize({
                width: event.currentTarget.naturalWidth,
                height: event.currentTarget.naturalHeight,
              })
            }
            onError={() => setFailed(true)}
          />
        )}
      </div>
    </dialog>,
    document.body,
  );
}

export function imageForViewer(target: HTMLElement): ViewerImage | null {
  if (target instanceof HTMLImageElement)
    return { src: target.currentSrc || target.src, alt: target.alt, trigger: target };
  const svg = target.querySelector('svg');
  if (!svg) return null;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const box = svg.viewBox.baseVal;
  clone.setAttribute('width', String(box.width || svg.clientWidth));
  clone.setAttribute('height', String(box.height || svg.clientHeight));
  clone.style.removeProperty('max-width');
  clone.style.removeProperty('width');
  return {
    src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`,
    alt: svg.querySelector('title')?.textContent || '图表',
    trigger: target,
  };
}
