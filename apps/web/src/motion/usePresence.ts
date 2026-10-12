import type { RefObject } from 'react';
import type { EnterTimeline } from '../types/reading.ts';
import { useLayoutEffect, useRef, useState } from 'react';
import { MOTION } from './tokens.ts';

// Retain outgoing content until its actual animation completes. Reversals sample
// the visible frame before cancelling, and stale completions can never replace a newer choice.
export function usePresence<T, E extends HTMLElement = HTMLDivElement>(
  value: T,
  key: string | null,
  reduced: boolean,
  offset = 'translateY(8px)',
  duration?: number,
  enterTimeline?: RefObject<EnterTimeline>,
) {
  const [retained, setRetained] = useState(() => ({ value, key }));
  const snapshot = useRef(value),
    mountedKey = useRef<string | null>(null);
  const ref = useRef<E>(null),
    animation = useRef<Animation>(null),
    mounted = useRef<HTMLElement>(null);
  const latest = useRef({ value, key });
  latest.current = { value, key };
  const closing = retained.key != null && retained.key !== key;
  if (retained.key === key) snapshot.current = value;
  const shown = snapshot.current;
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || reduced) {
      animation.current?.cancel();
      animation.current = null;
      if (enterTimeline) enterTimeline.current.animation = null;
      mounted.current = element;
      mountedKey.current = retained.key;
      if (retained.key !== key) setRetained(latest.current);
      return;
    }
    const fresh = mounted.current !== element || mountedKey.current !== retained.key;
    mounted.current = element;
    mountedKey.current = retained.key;
    const style = getComputedStyle(element);
    const from =
      fresh && !closing
        ? { opacity: 0, transform: offset }
        : { opacity: style.opacity, transform: style.transform };
    animation.current?.cancel();
    const target = closing ? { opacity: 0, transform: offset } : { opacity: 1, transform: 'none' };
    const next = element.animate([from, target], {
      duration: duration ?? (closing ? MOTION.exit : MOTION.enter),
      easing: MOTION.ease,
      fill: 'both',
    });
    animation.current = next;
    if (enterTimeline && !closing) {
      // The scene owns entry time; mounting the panel must not start a second clock.
      next.pause();
      next.currentTime = enterTimeline.current.progress * (duration ?? MOTION.enter);
      enterTimeline.current.animation = next;
    } else if (enterTimeline) enterTimeline.current.animation = null;
    next.finished.then(
      () => {
        if (animation.current !== next) return;
        if (closing) {
          // Leave opacity at zero until React has installed the latest content.
          setRetained(latest.current);
        }
      },
      () => {},
    );
  }, [key, retained.key, reduced, offset, duration, enterTimeline]);
  useLayoutEffect(
    () => () => {
      animation.current?.cancel();
      if (enterTimeline) enterTimeline.current.animation = null;
    },
    [],
  );
  return { shown, ref, closing };
}
