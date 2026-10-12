import type { Point } from '../types/reading.ts';
import { smooth } from './tokens.ts';

export function cardFlight(origin: Point, target: Point, elapsed: number) {
  const progress = Math.max(0, Math.min(1, elapsed / 650));
  const travel = smooth(progress);
  const bend = Math.min(48, Math.hypot(target.x - origin.x, target.y - origin.y) * 0.12);
  const arrival = smooth((elapsed - 650) / 150);
  return {
    x: origin.x + (target.x - origin.x) * travel,
    y: origin.y + (target.y - origin.y) * travel - Math.sin(Math.PI * travel) * bend,
    scale: 1 - 0.92 * smooth(progress / 0.8),
    textOpacity: 1 - smooth((progress - 0.2) / 0.5),
    starOpacity: smooth((progress - 0.12) / 0.35) * (1 - arrival),
    starScale: 0.4 + 0.65 * smooth(progress / 0.65),
    ringOpacity: elapsed >= 650 ? 0.6 * (1 - arrival) : 0,
    ringScale: 1 + arrival * 2,
  };
}
