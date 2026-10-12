import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { createGalaxy } from '../galaxy/scene.ts';
import type { Flight } from '../types/ui.ts';
export function useReadingFlight(
  scene: RefObject<ReturnType<typeof createGalaxy> | null>,
  selected: string | null,
  reduced: boolean,
) {
  const [flight, setFlight] = useState<Flight | null>(null);
  const pendingFlight = useRef<{
    key: string;
    source: string;
    target: string;
    revealed?: boolean;
    navigate(): void;
  } | null>(null);
  const [revealedFlight, setRevealedFlight] = useState<string | null>(null);
  const revealFlight = useCallback((key: string) => {
    const pending = pendingFlight.current;
    if (!pending || pending.key !== key || pending.revealed) return;
    pending.revealed = true;
    setRevealedFlight(key);
    pending.navigate();
  }, []);
  const finishFlight = useCallback((key: string) => {
    const pending = pendingFlight.current;
    if (!pending || pending.key !== key) return;
    pendingFlight.current = null;
    setFlight(null);
    if (!pending.revealed) pending.navigate();
  }, []);
  useEffect(() => {
    const pending = pendingFlight.current;
    if (pending && (pending.revealed ? pending.target : pending.source) !== selected) {
      pendingFlight.current = null;
      setFlight(null);
      scene.current?.cancelReadingTravel();
    }
  }, [selected, scene]);
  const selectWithFlight = (id: string, card: HTMLButtonElement, navigate: () => void) => {
    if (
      !reduced &&
      selected &&
      id !== selected &&
      card &&
      scene.current?.prepareReadingTravel(id)
    ) {
      const title = card.querySelector('strong') || card;
      const box = title.getBoundingClientRect(),
        style = getComputedStyle(title);
      const key = crypto.randomUUID();
      pendingFlight.current = {
        key,
        source: selected,
        target: id,
        navigate: () => navigate(),
      };
      setFlight({
        key,
        id,
        title: title.textContent!,
        x: box.x + box.width / 2,
        y: box.y + box.height / 2,
        width: box.width,
        fontSize: style.fontSize,
        fontFamily: style.fontFamily,
        color: style.color,
      });
      return;
    }
    pendingFlight.current = null;
    setFlight(null);
    navigate();
  };
  return { flight, revealedFlight, revealFlight, finishFlight, selectWithFlight };
}
