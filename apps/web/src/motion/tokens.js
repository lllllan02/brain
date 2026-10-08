// Milliseconds, shared by DOM transitions and the scene. Ambient motion stays slower.
export const MOTION = Object.freeze({
  feedback: 160, exit: 220, enter: 360, layout: 480, stagger: 28,
  camera: 1000, morph: 1200, expand: 2200, collapse: 1200,
  flow: 4200, pulse: 1500, maxFrame: 50,
  ease: 'cubic-bezier(.22,.68,0,1)',
});
export const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
export const damp = (dt, seconds) => 1 - Math.exp(-Math.max(0, dt) / seconds);
export const stagger = index => Math.min(index, 8) * MOTION.stagger;
export const motionVariables = Object.fromEntries(Object.entries(MOTION).map(([key, value]) =>
  [`--motion-${key}`, typeof value === 'number' ? `${value}ms` : value]));

// Distance-based sampling gives each dot steady speed even on strongly bent curves.
export function curvePoint(curve, t) {
  const {x, y, endX, endY, bend} = curve, s = 1 - t;
  return {x: s ** 3 * x + 3 * s * s * t * (x + bend) + 3 * s * t * t * (endX - bend * .65) + t ** 3 * endX,
    y: y + (endY - y) * smooth(t)};
}
export function curveSamples(curve, count = 32) {
  const points = [curvePoint(curve, 0)];
  let length = 0;
  const distances = [0];
  for (let i = 1; i <= count; i++) {
    points.push(curvePoint(curve, i / count));
    length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    distances.push(length);
  }
  return {points, distances, length};
}
export function pointAlongCurve(samples, progress) {
  const {points, distances, length} = samples, distance = Math.max(0, Math.min(1, progress)) * length;
  let i = 1;
  while (i < distances.length - 1 && distances[i] < distance) i++;
  const t = (distance - distances[i - 1]) / (distances[i] - distances[i - 1] || 1);
  return {x: points[i - 1].x + (points[i].x - points[i - 1].x) * t,
    y: points[i - 1].y + (points[i].y - points[i - 1].y) * t};
}
