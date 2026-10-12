import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { decorateExternalLinks, externalLink } from './external-links.ts';
import './external-links.css';

export function ExternalLinkPreview({
  readerRef,
  html,
}: {
  readerRef: React.RefObject<HTMLElement | null>;
  html?: string;
}) {
  const [preview, setPreview] = useState<
    (NonNullable<ReturnType<typeof externalLink>> & { rect: DOMRect }) | null
  >(null);
  const [position, setPosition] = useState<React.CSSProperties | null>(null);
  const card = useRef<HTMLElement>(null);
  useEffect(() => {
    decorateExternalLinks(readerRef.current!, import.meta.env.BASE_URL);
    let timer: ReturnType<typeof setTimeout> | undefined,
      closeTimer: ReturnType<typeof setTimeout> | undefined,
      active: Element | null;
    const close = () => {
      clearTimeout(timer);
      clearTimeout(closeTimer);
      active?.removeAttribute('aria-describedby');
      active = null;
      setPreview(null);
    };
    const find = (target: EventTarget | null) =>
      target instanceof Element ? target.closest('.external-site-link') : null;
    const enter = (event: Event) => {
      if (card.current?.contains(event.target as Node | null)) {
        clearTimeout(closeTimer);
        return;
      }
      if (event.type === 'pointerover' && (event as PointerEvent).pointerType !== 'mouse') return;
      const anchor = find(event.target);
      if (
        !anchor ||
        !(readerRef.current!.contains(anchor) || anchor.closest('.link-preview .markdown'))
      )
        return;
      if (anchor === active) {
        clearTimeout(closeTimer);
        return;
      }
      const link = externalLink(anchor.getAttribute('href'));
      if (!link) return;
      close();
      active = anchor;
      timer = setTimeout(() => {
        anchor.setAttribute('aria-describedby', 'external-address-preview');
        setPosition(null);
        setPreview({ ...link, rect: anchor.getBoundingClientRect() });
      }, 250);
    };
    const leave = (event: Event) => {
      if (
        (event as FocusEvent).relatedTarget instanceof Node &&
        (active?.contains((event as FocusEvent).relatedTarget as Node | null) ||
          card.current?.contains((event as FocusEvent).relatedTarget as Node | null))
      )
        return;
      if (find(event.target) === active || card.current?.contains(event.target as Node | null)) {
        clearTimeout(closeTimer);
        closeTimer = setTimeout(close, 180);
      }
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && active) {
        event.preventDefault();
        event.stopImmediatePropagation();
        close();
      }
    };
    const scroll = (event: Event) => {
      if (card.current && !card.current.contains(event.target as Node | null)) close();
    };
    const click = (event: Event) => {
      if (!card.current?.contains(event.target as Node | null)) close();
    };
    const events: [string, EventListener][] = [
      ['pointerover', enter],
      ['focusin', enter],
      ['pointerout', leave],
      ['focusout', leave],
      ['click', click],
    ];
    events.forEach(([name, fn]) => document.addEventListener(name, fn));
    window.addEventListener('keydown', key, true);
    window.addEventListener('scroll', scroll, true);
    window.addEventListener('resize', close);
    return () => {
      close();
      events.forEach(([name, fn]) => document.removeEventListener(name, fn));
      window.removeEventListener('keydown', key, true);
      window.removeEventListener('scroll', scroll, true);
      window.removeEventListener('resize', close);
    };
  }, [readerRef, html]);
  useLayoutEffect(() => {
    if (!preview || !card.current) return;
    const { rect } = preview;
    const { width, height } = card.current.getBoundingClientRect();
    setPosition({
      left: Math.max(12, Math.min(rect.left, innerWidth - width - 12)),
      top: Math.max(
        12,
        Math.min(
          rect.bottom + 4 + height <= innerHeight - 12 ? rect.bottom + 4 : rect.top - height - 4,
          innerHeight - height - 12,
        ),
      ),
    });
  }, [preview]);
  if (!preview) return null;
  return createPortal(
    <aside
      id="external-address-preview"
      ref={card}
      className="external-address-preview"
      role="tooltip"
      style={position || { visibility: 'hidden' }}
    >
      <strong>{preview.host}</strong>
      <span>{preview.href}</span>
    </aside>,
    document.body,
  );
}
