import type { RollerOption } from '../types/ui.ts';
import React, { useEffect, useRef, useState } from 'react';

// A fixed lens with a draggable, circular strip of options.
export function RollerSelect({
  options,
  active,
  onChoose,
  label,
}: {
  options: RollerOption[];
  active: string | null;
  onChoose(mode: string): void;
  label: string;
}) {
  const [lastMode, setLastMode] = useState(options[0]?.[0]);
  const root = useRef(null),
    gesture = useRef({ time: 0, delta: 0, used: false }),
    drag = useRef(null);
  const [dragX, setDragX] = useState(null);
  const enabled = options;
  const center = enabled.findIndex(([mode]) => mode === (active || lastMode));
  const index = Math.max(0, center);
  const choose = (mode) => {
    setLastMode(mode);
    onChoose(mode);
  };
  const offsetFor = (position, origin = index) => {
    const raw = position - origin + (dragX ?? 0);
    let offset = ((raw % enabled.length) + enabled.length) % enabled.length;
    if (offset > enabled.length / 2) offset -= enabled.length;
    return offset;
  };
  const slotPosition = (offset) =>
    Math.sign(offset) *
    (Math.abs(offset) <= 1 ? Math.abs(offset) * 24 : 24 + (Math.abs(offset) - 1) * 18);
  const finishDrag = (event) => {
    const state = drag.current;
    if (!state || event.pointerId !== state.id) return;
    if (event.type !== 'pointercancel' && !state.moved && state.mode) choose(state.mode);
    drag.current = null;
    setDragX(null);
    if (root.current.hasPointerCapture(event.pointerId))
      root.current.releasePointerCapture(event.pointerId);
  };
  const step = (direction) =>
    choose(enabled[(index + direction + enabled.length) % enabled.length][0]);
  const stepRef = useRef(step);
  stepRef.current = step;

  useEffect(() => {
    const element = root.current;
    const wheel = (event) => {
      if (event.ctrlKey) return; // Preserve browser pinch zoom.
      event.preventDefault();
      event.stopPropagation();
      const now = performance.now(),
        state = gesture.current;
      if (now - state.time > 180) {
        state.delta = 0;
        state.used = false;
      }
      state.time = now;
      if (state.used) return;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      const amount =
        delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientWidth : 1);
      if (Math.sign(amount) !== Math.sign(state.delta)) state.delta = 0;
      state.delta += amount;
      if (Math.abs(state.delta) >= 24) {
        state.used = true;
        stepRef.current(Math.sign(state.delta));
      }
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, []);

  return (
    <nav
      ref={root}
      className={`list-modes${dragX !== null ? ' is-dragging' : ''}`}
      aria-label={`${label}，拖动文字、滚动或使用方向键切换`}
      title={`${label}：拖动文字切换`}
      tabIndex={0}
      onPointerDown={(event) => {
        if (event.button !== 0 || !event.isPrimary) return;
        const bounds = root.current.getBoundingClientRect();
        drag.current = {
          id: event.pointerId,
          x: event.clientX,
          width: bounds.width,
          index,
          moved: false,
          mode: (event.target as Element).closest('button')?.dataset.mode,
          selected: enabled[index][0],
        };
        root.current.setPointerCapture(event.pointerId);
        root.current.focus({ preventScroll: true });
      }}
      onPointerMove={(event) => {
        const state = drag.current;
        if (!state || event.pointerId !== state.id) return;
        const dx = event.clientX - state.x;
        if (!state.moved && Math.abs(dx) < 4) return;
        state.moved = true;
        const shift = dx / (state.width * 0.396);
        setDragX(shift);
        const nextIndex =
          (((state.index - Math.round(shift)) % enabled.length) + enabled.length) % enabled.length;
        const nearest = enabled[nextIndex][0];
        if (nearest !== state.selected) {
          state.selected = nearest;
          choose(nearest);
        }
      }}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onLostPointerCapture={() => {
        drag.current = null;
        setDragX(null);
      }}
      onKeyDown={(event) => {
        const direction = ['ArrowRight', 'ArrowDown'].includes(event.key)
          ? 1
          : ['ArrowLeft', 'ArrowUp'].includes(event.key)
            ? -1
            : 0;
        if (direction || ['Home', 'End', 'Enter', ' '].includes(event.key)) {
          event.preventDefault();
          event.stopPropagation();
          if (direction) step(direction);
          else
            choose(
              enabled[
                event.key === 'Home' ? 0 : event.key === 'End' ? enabled.length - 1 : index
              ][0],
            );
        }
      }}
    >
      <span className="list-mode-window" aria-hidden="true" />
      <div className="list-mode-drum">
        {enabled.map(([mode, label, title, count, buttonRef], position) => {
          const offset = offsetFor(
            position,
            dragX !== null ? (drag.current?.index ?? index) : index,
          );
          const centered = Math.abs(offset) < 0.5;
          return (
            <button
              key={mode}
              type="button"
              title={title}
              tabIndex={-1}
              data-mode={mode}
              className={`list-mode-option${centered ? ' is-centered' : ''}`}
              style={{
                '--slot-x': `${slotPosition(offset)}%`,
                '--distance': Math.min(2, Math.abs(offset)),
              }}
              ref={buttonRef}
              aria-pressed={active === mode}
              onClick={() => choose(mode)}
            >
              {label}
              {count != null && centered && dragX === null && <small>{count}</small>}
            </button>
          );
        })}
      </div>
      <span className="list-mode-announcement" role="status">
        {active ? enabled.find(([mode]) => mode === active)?.[1] : '未选择'}
      </span>
    </nav>
  );
}
