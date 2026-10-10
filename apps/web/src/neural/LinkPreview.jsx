import {Icon} from './icons';
import React, {memo, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import './link-preview.css';
import {usePresence} from '../motion/usePresence';
import {motionVariables} from '../motion/tokens.js';
import {MarkdownArticle} from './MarkdownArticle';

// Only use the already-filtered library, including in the public Pages build.
function resolvePreview(element, graph) {
  const href = element.getAttribute('href') || element.dataset.previewHref;
  const match = /^#\/doc\/([^/]+)(?:\/([^/]+))?$/.exec(href || '');
  if (!match) return null;
  try {
    const node = graph.index.get(decodeURIComponent(match[1]));
    return node?.html != null ? {element, node, href, anchor: decodeURIComponent(match[2] || '')} : null;
  } catch { return null; }
}

export const LinkPreview = memo(function LinkPreview({readerRef, graph, onPreview, reduced}) {
  const [requested, setPreview] = useState(null);
  const {shown: preview, ref: cardRef, closing} = usePresence(requested, requested?.href || null, reduced);
  const scrollRef = useRef(null);
  const [position, setPosition] = useState(null);
  const html = useMemo(() => {
    if (!preview) return '';
    const content = new DOMParser().parseFromString(preview.node.html, 'text/html');
    // Keep anchor lookup local without duplicating the reader's document IDs.
    content.querySelectorAll('[id]').forEach(element => {
      element.dataset.previewAnchor = element.id;
      element.removeAttribute('id');
    });
    content.querySelectorAll('.copy-code').forEach(element => element.remove());
    return content.body.innerHTML;
  }, [preview]);

  useEffect(() => {
    const reader = readerRef.current;
    setPreview(null);
    setPosition(null);
    let openTimer, closeTimer, active = null, suppressed = null;
    const contains = (parent, target) => target instanceof Node && parent?.contains(target);
    const find = target => target instanceof Element
      ? target.closest('.markdown a[href], .read-relation[data-preview-href]') : null;
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
    const enter = event => {
      if (event.type === 'pointerover' && event.pointerType !== 'mouse') return;
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
      next.rect = [...element.getClientRects()].find(rect => event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom) || element.getBoundingClientRect();
      openTimer = setTimeout(() => {
        if (next.keyboard) next.rect = element.getBoundingClientRect();
        setPreview(next);
      }, 220);
    };
    const leave = event => {
      const element = find(event.target);
      if (contains(element, event.relatedTarget)) return;
      if (element === suppressed) suppressed = null;
      if (element !== active?.element) return;
      if (contains(cardRef.current, event.relatedTarget)) { cancelClose(); return; }
      // Allow time to cross the reader from the link to the card beside it.
      scheduleClose(cardRef.current ? 600 : 180);
    };
    const move = event => {
      if (contains(cardRef.current, event.target)) cancelClose();
      else if (contains(cardRef.current, event.relatedTarget) && !contains(active?.element, event.target)) scheduleClose();
    };
    const key = event => {
      if (!active) return;
      const card = cardRef.current;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        suppressed = active.element;
        if (contains(card, document.activeElement)) suppressed.focus({preventScroll: true});
        close();
      } else if (event.key === 'Tab' && card && !event.shiftKey && document.activeElement === active.element) {
        event.preventDefault();
        card.querySelector('a').focus({preventScroll: true});
      } else if (event.key === 'Tab' && event.shiftKey && document.activeElement === card?.querySelector('a')) {
        event.preventDefault();
        active.element.focus({preventScroll: true});
      }
    };
    const scroll = event => {
      // Focusing a link may first scroll it into view; position after that scroll.
      if (active?.keyboard && !cardRef.current) {
        clearTimeout(openTimer);
        openTimer = setTimeout(() => {
          active.rect = active.element.getBoundingClientRect();
          setPreview(active);
        }, 220);
        return;
      }
      if (!contains(cardRef.current, event.target)) close();
    };
    const click = event => {
      if (event.target.closest('.link-preview-close') && active) {
        suppressed = active.element;
        suppressed.focus({preventScroll: true});
      }
      if (!contains(cardRef.current, event.target) || event.target.closest('a,button')) close();
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
    const rect = preview.rect;
    const margin = 12, gap = 8;
    const reader = readerRef.current.getBoundingClientRect();
    const sideGap = 16;
    const leftSpace = reader.left - sideGap - margin;
    if (leftSpace >= 280) {
      const width = Math.min(420, leftSpace);
      const topEdge = Math.max(margin, reader.top);
      const bottomEdge = Math.min(window.innerHeight - margin, reader.bottom);
      const maxHeight = Math.min(400, window.innerHeight * .65, bottomEdge - topEdge);
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
    const below = window.innerHeight - rect.bottom - gap - margin;
    const above = rect.top - gap - margin;
    const down = below >= Math.min(400, window.innerHeight * .65) || below >= above;
    const maxHeight = Math.max(0, Math.min(400, window.innerHeight * .65, down ? below : above));
    const height = Math.min(cardRef.current.offsetHeight, maxHeight);
    setPosition({width, maxHeight, left: Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin)), top: down ? rect.bottom + gap : Math.max(margin, rect.top - gap - height)});
  }, [preview, html, readerRef]);

  useLayoutEffect(() => {
    if (!preview || !position) return;
    const scroller = scrollRef.current;
    const target = [...scroller.querySelectorAll('[data-preview-anchor]')].find(element => element.dataset.previewAnchor === preview.anchor);
    scroller.scrollTop = target ? target.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 12 : 0;
  }, [preview, position]);

  if (!preview) return null;
  return createPortal(
    <aside ref={cardRef} className="neural link-preview" inert={closing} role="dialog" aria-label={`预览：${preview.node.title}`} style={{...motionVariables, ...(position || {visibility: 'hidden'})}}>
      <header className="link-preview-header">
        <div><span className="link-preview-label">文档预览 · {preview.node.category || '未分类'}</span><a className="link-preview-title" href={preview.href}>{preview.node.title}</a></div>
        <button type="button" className="link-preview-close" aria-label="关闭预览" title="关闭预览"><Icon name="close" size={16}/></button>
      </header>
      <div className="link-preview-scroll" ref={scrollRef} tabIndex={0} aria-label="预览正文"><MarkdownArticle html={html}/></div>
      <footer className="link-preview-footer"><span>滚动预览</span><a href={preview.href}>打开文档 ↗</a></footer>
    </aside>, document.body
  );
});
