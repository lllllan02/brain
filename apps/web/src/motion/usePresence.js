import {useLayoutEffect, useRef, useState} from 'react';
import {MOTION} from './tokens.js';

// Retain outgoing content until its actual animation completes. Reversals sample
// the visible frame before cancelling, and stale completions can never replace a newer choice.
export function usePresence(value, key, reduced, offset = 'translateY(8px)') {
  const [retained, setRetained] = useState(() => ({value, key}));
  const snapshot = useRef(value), mountedKey = useRef(null);
  const ref = useRef(null), animation = useRef(null), mounted = useRef(null);
  const latest = useRef({value, key});
  latest.current = {value, key};
  const closing = retained.key != null && retained.key !== key;
  if (retained.key === key) snapshot.current = value;
  const shown = snapshot.current;
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || reduced) {
      animation.current?.cancel();
      animation.current = null;
      mounted.current = element; mountedKey.current = retained.key;
      if (retained.key !== key) setRetained(latest.current);
      return;
    }
    const fresh = mounted.current !== element || mountedKey.current !== retained.key;
    mounted.current = element;
    mountedKey.current = retained.key;
    const style = getComputedStyle(element);
    const from = fresh && !closing ? {opacity: 0, transform: offset} : {opacity: style.opacity, transform: style.transform};
    animation.current?.cancel();
    const target = closing ? {opacity: 0, transform: offset} : {opacity: 1, transform: 'none'};
    const next = element.animate([from, target], {
      duration: closing ? MOTION.exit : MOTION.enter, easing: MOTION.ease, fill: 'both',
    });
    animation.current = next;
    next.finished.then(() => {
      if (animation.current !== next) return;
      if (closing) {
        // Leave opacity at zero until React has installed the latest content.
        setRetained(latest.current);
      }
    }, () => {});
  }, [key, retained.key, reduced, offset]);
  useLayoutEffect(() => () => animation.current?.cancel(), []);
  return {shown, ref, closing};
}
