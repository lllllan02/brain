import {useLayoutEffect, useRef} from 'react';
import {readViewState, writeViewState, validSize} from './view-state';

export function useReaderResize(readerRef, full, onResize) {
 const drag = useRef(null);
 const sizeKey = full ? 'readerSize:full' : 'readerSize:side';
 useLayoutEffect(() => {
  const wrap = readerRef.current.closest('.analysis-wrap');
  const restore = () => {
   drag.current = null;
   wrap.classList.remove('reader-resized', 'reader-resizing');
   wrap.style.removeProperty('--reader-width');
   wrap.style.removeProperty('--reader-height');
   const saved = readViewState(sizeKey, null, validSize);
   if (saved && window.matchMedia('(min-width: 901px)').matches) apply(saved.width, saved.height, false);
  };
  restore();
  window.addEventListener('resize', restore);
  return () => {
   window.removeEventListener('resize', restore);
   drag.current = null;
   wrap.classList.remove('reader-resizing');
  };
 }, [readerRef, full]);
 const apply = (width, height, persist = true) => {
  const wrap = readerRef.current.closest('.analysis-wrap');
  const rect = wrap.getBoundingClientRect();
  const page = wrap.closest('.galaxy-page');
  const listSpace = page.classList.contains('galaxy-browsing') ? 236 : 16;
  const maxWidth = Math.max(0, rect.right - listSpace);
  const maxHeight = Math.max(0, window.innerHeight - rect.top - 24);
  wrap.style.setProperty('--reader-width', `${Math.min(maxWidth, Math.max(320, width))}px`);
  wrap.style.setProperty('--reader-height', `${Math.min(maxHeight, Math.max(240, height))}px`);
  wrap.classList.add('reader-resized');
  if (persist) writeViewState(sizeKey, {width: Math.max(320, Math.min(maxWidth, width)), height: Math.max(240, Math.min(maxHeight, height))});
  onResize?.();
 };
 const end = e => {
  if (drag.current?.id !== e.pointerId) return;
  drag.current = null;
  readerRef.current.closest('.analysis-wrap').classList.remove('reader-resizing');
  if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
 };
 return {
  onPointerDown(e) {
   if (e.button !== 0) return;
   e.preventDefault();
   const wrap = readerRef.current.closest('.analysis-wrap');
   const rect = wrap.getBoundingClientRect();
   drag.current = {id: e.pointerId, x: e.clientX, y: e.clientY, width: rect.width, height: rect.height};
   wrap.classList.add('reader-resizing');
   e.currentTarget.setPointerCapture(e.pointerId);
  },
  onPointerMove(e) {
   const start = drag.current;
   if (!start || start.id !== e.pointerId) return;
   apply(start.width + start.x - e.clientX, start.height + e.clientY - start.y);
  },
  onPointerUp: end,
  onPointerCancel: end,
  onLostPointerCapture: end,
  onKeyDown(e) {
   if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
   e.preventDefault();
   e.stopPropagation();
   const rect = readerRef.current.closest('.analysis-wrap').getBoundingClientRect();
   const step = e.shiftKey ? 64 : 16;
   apply(rect.width + (e.key === 'ArrowLeft' ? step : e.key === 'ArrowRight' ? -step : 0),
    rect.height + (e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0));
  },
 };
}
