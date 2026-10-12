import type { ReaderGraph, ReaderNode } from '../types/graph.ts';
import type { ReadingQueue } from '../types/reading.ts';
import { CollectionIcon } from './CollectionIcon.tsx';
import { Icon } from './icons.tsx';
import React, { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './link-preview.css';
import { usePresence } from '../motion/usePresence.ts';
import { motionVariables } from '../motion/tokens.ts';
import { ReaderSources } from './ReaderSources.tsx';
import { MarkdownArticle } from './MarkdownArticle.tsx';
import { ReadingQueueButton } from './ReadingQueueButton.tsx';

// Only use the already-filtered library, including in the public Pages build.
function resolvePreview(
  element: HTMLElement,
  graph: ReaderGraph,
): {
  element: HTMLElement;
  node: ReaderNode;
  href: string;
  anchor: string;
  keyboard?: boolean;
  rect?: DOMRect;
} | null {
  const href = element.getAttribute('href') || element.dataset.previewHref;
  const match = /^#\/doc\/([^/]+)(?:\/([^/]+))?$/.exec(href || '');
  if (!match) return null;
  try {
    const node = graph.index.get(decodeURIComponent(match[1]));
    return node?.html != null
      ? { element, node, href: href!, anchor: decodeURIComponent(match[2] || '') }
      : null;
  } catch {
    return null;
  }
}

export const LinkPreview = memo(function LinkPreview({
  readerRef,
  graph,
  onPreview,
  reduced,
  queue,
}: {
  readerRef: React.RefObject<HTMLElement | null>;
  graph: ReaderGraph;
  onPreview: (id: string | null) => void;
  reduced: boolean;
  queue: ReadingQueue;
}) {
  const [requested, setPreview] = useState<ReturnType<typeof resolvePreview>>(null);
  const {
    shown: preview,
    ref: cardRef,
    closing,
  } = usePresence(requested, requested?.href || null, reduced);
  const scrollRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLDivElement>(null);
  const [actionPosition, setActionPosition] = useState<React.CSSProperties | null>(null);
  const [position, setPosition] = useState<React.CSSProperties | null>(null);
  const html = useMemo(() => {
    if (!preview) return '';
    const content = new DOMParser().parseFromString(preview.node.html!, 'text/html');
    // Keep anchor lookup local without duplicating the reader's document IDs.
    content.querySelectorAll<HTMLElement>('[id]').forEach((element) => {
      element.dataset.previewAnchor = element.id;
      element.removeAttribute('id');
    });
    content.querySelectorAll('.copy-code').forEach((element) => element.remove());
    return content.body.innerHTML;
  }, [preview]);

  useEffect(() => {
    const reader = readerRef.current!;
    setPreview(null);
    setPosition(null);
    let openTimer: ReturnType<typeof setTimeout> | undefined,
      closeTimer: ReturnType<typeof setTimeout> | undefined,
      active: ReturnType<typeof resolvePreview> = null,
      suppressed: HTMLElement | null = null;
    const contains = (parent: Node | null | undefined, target: EventTarget | null) =>
      target instanceof Node && parent?.contains(target);
    const inPreview = (target: EventTarget | null) =>
      contains(cardRef.current, target) || contains(actionRef.current, target);
    const find = (target: EventTarget | null) =>
      target instanceof Element
        ? target.closest<HTMLElement>('.markdown a[href], .read-relation[data-preview-href]')
        : null;
    const cancelClose = () => clearTimeout(closeTimer);
    const close = () => {
      clearTimeout(openTimer);
      cancelClose();
      active = null;
      onPreview?.(null);
      setPreview(null);
    };
    const scheduleClose = (delay = 180) => {
      clearTimeout(openTimer);
      cancelClose();
      closeTimer = setTimeout(close, delay);
    };
    const enter = (event: Event) => {
      if (event.type === 'pointerover' && (event as PointerEvent).pointerType !== 'mouse') return;
      const element = find(event.target);
      if (!element || !reader.contains(element) || element === suppressed) return;
      const next = resolvePreview(element, graph);
      if (!next) return;
      cancelClose();
      if (active?.element === element && cardRef.current) return;
      close();
      active = next;
      onPreview?.(next.node.id);
      next.keyboard = event.type === 'focusin';
      // A wrapped link can occupy several lines; anchor to the hovered line.
      next.rect =
        [...element.getClientRects()].find(
          (rect) =>
            (event as MouseEvent).clientX >= rect.left &&
            (event as MouseEvent).clientX <= rect.right &&
            (event as MouseEvent).clientY >= rect.top &&
            (event as MouseEvent).clientY <= rect.bottom,
        ) || element.getBoundingClientRect();
      openTimer = setTimeout(() => {
        if (next.keyboard) next.rect = element.getBoundingClientRect();
        setPreview(next);
      }, 220);
    };
    const leave = (event: Event) => {
      const element = find(event.target);
      if (contains(element, (event as FocusEvent).relatedTarget)) return;
      if (element === suppressed) suppressed = null;
      if (element !== active?.element) return;
      if (inPreview((event as FocusEvent).relatedTarget)) {
        cancelClose();
        return;
      }
      // Allow time to cross the reader from the link to the card beside it.
      scheduleClose(cardRef.current ? 600 : 180);
    };
    const move = (event: Event) => {
      if (inPreview(event.target)) cancelClose();
      else if (
        inPreview((event as FocusEvent).relatedTarget) &&
        !contains(active?.element, event.target)
      )
        scheduleClose();
    };
    const key = (event: KeyboardEvent) => {
      if (!active) return;
      const card = cardRef.current;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        suppressed = active.element;
        if (inPreview(document.activeElement)) suppressed.focus({ preventScroll: true });
        close();
      } else if (
        event.key === 'Tab' &&
        card &&
        !event.shiftKey &&
        document.activeElement === active.element
      ) {
        event.preventDefault();
        (actionRef.current?.querySelector('button') || card.querySelector('a'))!.focus({
          preventScroll: true,
        });
      } else if (
        event.key === 'Tab' &&
        event.shiftKey &&
        document.activeElement ===
          (actionRef.current?.querySelector('button') || card?.querySelector('a'))
      ) {
        event.preventDefault();
        active.element.focus({ preventScroll: true });
      }
    };
    const scroll = (event: Event) => {
      // Focusing a link may first scroll it into view; position after that scroll.
      if (active?.keyboard && !cardRef.current) {
        clearTimeout(openTimer);
        openTimer = setTimeout(() => {
          active!.rect = active!.element.getBoundingClientRect();
          setPreview(active);
        }, 220);
        return;
      }
      if (!inPreview(event.target)) close();
    };
    const click = (event: MouseEvent) => {
      if (contains(actionRef.current, event.target)) return;
      if ((event.target as Element).closest<HTMLElement>('.link-preview-close') && active) {
        suppressed = active.element;
        suppressed.focus({ preventScroll: true });
      }
      if (!inPreview(event.target) || (event.target as Element).closest<HTMLElement>('a,button'))
        close();
    };
    reader.addEventListener('pointerover', enter);
    reader.addEventListener('pointerout', leave);
    reader.addEventListener('focusin', enter);
    reader.addEventListener('focusout', leave);
    document.addEventListener('pointerover', move);
    document.addEventListener('focusin', move);
    document.addEventListener('click', click);
    window.addEventListener('keydown', key, true);
    window.addEventListener('scroll', scroll, true);
    window.addEventListener('resize', close);
    window.addEventListener('hashchange', close);
    return () => {
      onPreview?.(null);
      clearTimeout(openTimer);
      clearTimeout(closeTimer);
      reader.removeEventListener('pointerover', enter);
      reader.removeEventListener('pointerout', leave);
      reader.removeEventListener('focusin', enter);
      reader.removeEventListener('focusout', leave);
      document.removeEventListener('pointerover', move);
      document.removeEventListener('focusin', move);
      document.removeEventListener('click', click);
      window.removeEventListener('keydown', key, true);
      window.removeEventListener('scroll', scroll, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('hashchange', close);
    };
  }, [readerRef, graph, onPreview]);

  useLayoutEffect(() => {
    if (!preview) return;
    const rect = preview.rect!;
    const margin = 12,
      gap = 8;
    const action = actionRef.current?.getBoundingClientRect();
    setActionPosition(
      action
        ? {
            left: Math.max(margin, Math.min(rect.left, window.innerWidth - action.width - margin)),
            top:
              rect.top >= action.height + gap + margin
                ? rect.top - action.height - gap
                : rect.bottom + gap,
          }
        : null,
    );
    const reader = readerRef.current!.getBoundingClientRect();
    const sideGap = 16;
    const leftSpace = reader.left - sideGap - margin;
    if (leftSpace >= 280) {
      const width = Math.min(420, leftSpace);
      const topEdge = Math.max(margin, reader.top);
      const bottomEdge = Math.min(window.innerHeight - margin, reader.bottom);
      const maxHeight = Math.min(400, window.innerHeight * 0.65, bottomEdge - topEdge);
      setPosition({
        width,
        maxHeight,
        left: reader.left - sideGap - width,
        top: Math.max(topEdge, Math.min(rect.top - 16, bottomEdge - maxHeight)),
      });
      return;
    }
    // A narrow or full-width reader has no usable side space.
    const width = Math.min(420, window.innerWidth - margin * 2);
    // Reserve room for the action when both overlays share the reader column.
    const actionAbove = action && rect.top >= action.height + gap + margin;
    const topGap = gap + (actionAbove ? action.height + gap : 0);
    const bottomGap = gap + (action && !actionAbove ? action.height + gap : 0);
    const below = window.innerHeight - rect.bottom - bottomGap - margin;
    const above = rect.top - topGap - margin;
    const down = below >= Math.min(400, window.innerHeight * 0.65) || below >= above;
    const maxHeight = Math.max(0, Math.min(400, window.innerHeight * 0.65, down ? below : above));
    const height = Math.min(cardRef.current!.offsetHeight, maxHeight);
    setPosition({
      width,
      maxHeight,
      left: Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin)),
      top: down ? rect.bottom + bottomGap : Math.max(margin, rect.top - topGap - height),
    });
  }, [preview, html, readerRef]);

  useLayoutEffect(() => {
    if (!preview || !position) return;
    const scroller = scrollRef.current!;
    const target = [...scroller.querySelectorAll<HTMLElement>('[data-preview-anchor]')].find(
      (element) => element.dataset.previewAnchor === preview.anchor,
    );
    scroller.scrollTop = target
      ? target.getBoundingClientRect().top -
        scroller.getBoundingClientRect().top +
        scroller.scrollTop -
        12
      : 0;
  }, [preview, position]);

  if (!preview) return null;
  return createPortal(
    <>
      {queue && preview.node.module && preview.element.matches('.markdown a') && (
        <div
          ref={actionRef}
          className="link-queue-popover"
          inert={closing}
          style={actionPosition || { visibility: 'hidden' }}
        >
          <ReadingQueueButton
            queue={queue}
            node={preview.node}
            className="link-queue-button"
            showLabel
          />
        </div>
      )}
      <aside
        ref={cardRef}
        className="neural link-preview"
        inert={closing}
        role="dialog"
        aria-label={`预览：${preview.node.title}`}
        style={{ ...motionVariables, ...(position || { visibility: 'hidden' }) }}
      >
        <header className="link-preview-header">
          <div>
            <span className="link-preview-label">
              文档预览 · {preview.node.category || '未分类'}
            </span>
            <a className="link-preview-title" href={preview.href}>
              <CollectionIcon collection={preview.node.collection} />
              {preview.node.title}
            </a>
          </div>
          <button
            type="button"
            className="link-preview-close"
            aria-label="关闭预览"
            title="关闭预览"
          >
            <Icon name="close" size={16} />
          </button>
        </header>
        <div className="link-preview-scroll" ref={scrollRef} tabIndex={0} aria-label="预览正文">
          <ReaderSources sources={preview.node.sources!} />
          <MarkdownArticle html={html} />
        </div>
        <footer className="link-preview-footer">
          <span>滚动预览</span>
          <a href={preview.href}>打开文档 ↗</a>
        </footer>
      </aside>
    </>,
    document.body,
  );
});
