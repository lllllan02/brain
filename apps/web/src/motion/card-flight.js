import {smooth} from './tokens.js';

export function cardFlight(origin, target, elapsed) {
  const progress = Math.max(0, Math.min(1, elapsed / 650));
  const travel = smooth(progress);
  const bend = Math.min(48, Math.hypot(target.x - origin.x, target.y - origin.y) * .12);
  const arrival = smooth((elapsed - 650) / 150);
  return {
    x:origin.x + (target.x - origin.x) * travel,
    y:origin.y + (target.y - origin.y) * travel - Math.sin(Math.PI * travel) * bend,
    scale:1 - .92 * smooth(progress / .8),
    textOpacity:1 - smooth((progress - .2) / .5),
    starOpacity:smooth((progress - .12) / .35) * (1 - arrival),
    starScale:.4 + .65 * smooth(progress / .65),
    ringOpacity:elapsed >= 650 ? .6 * (1 - arrival) : 0,
    ringScale:1 + arrival * 2,
  };
}
