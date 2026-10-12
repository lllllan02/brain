import { smooth } from './tokens.ts';

// Seconds. Both the WebGL cluster and SVG fan consume the renderer's clock.
export const READING_FLOW = Object.freeze({
  period: 3.6,
  travel: 1.1,
  handoff: 1.3,
  launch: 0.32,
  afterglow: 0.9,
  arrival: 0.18,
  batch: 3,
});

// Shared by the WebGL highlighted links and SVG fan, in CSS pixels / sRGB.
export const READING_INK = Object.freeze({
  thread: '#d3e6f4',
  core: '#e0f1ff',
  aura: '#9bc9ec',
  width: 0.9,
  coreWidth: 1.4,
  auraWidth: 6,
  opacity: 0.32,
});
export const readingInkVariables = {
  '--reading-thread': READING_INK.thread,
  '--reading-core': READING_INK.core,
  '--reading-aura': READING_INK.aura,
  '--reading-width': READING_INK.width,
  '--reading-core-width': READING_INK.coreWidth,
  '--reading-aura-width': READING_INK.auraWidth,
};

// The accelerating, lengthening light used by the reading-history trail.
export function beamEnvelope(phase: number) {
  const t = Math.max(0, Math.min(1, phase));
  const tail = 0.1 + 0.3 * t * t;
  return {
    tail,
    offset: tail - (1 + tail) * t * t,
    opacity:
      phase >= 0 && phase < 1 ? 0.65 * smooth(t / 0.18) * (1 - smooth((t - 0.88) / 0.12)) : 0,
  };
}

export function readingFlow(time: number, index: number, count: number, outgoing = false) {
  const { period, travel, handoff, launch, batch } = READING_FLOW;
  const cycle = Math.floor(time / period);
  const slot =
    (((index - cycle * batch) % Math.max(1, count)) + Math.max(1, count)) % Math.max(1, count);
  const phase = ((time % period) - (outgoing ? handoff : 0)) / (outgoing ? launch : travel);
  return {
    ...(outgoing ? launchEnvelope(phase) : beamEnvelope(phase)),
    phase,
    active: slot < batch && count > 0,
  };
}

// A bright leading edge and a stretching wake cross the fan in a short burst.
// Hold the light until the head reaches the card, then cut the wake quickly.
export function launchEnvelope(phase: number) {
  const p = Math.max(0, Math.min(1, phase)),
    tail = 0.08 + 0.42 * p * p;
  return {
    tail,
    offset: tail - (1 + tail) * p ** 1.65,
    opacity:
      phase >= 0 && phase < 1 ? 0.95 * smooth(p / 0.07) * (1 - smooth((p - 0.94) / 0.06)) : 0,
  };
}

export function launchAccent(time: number) {
  const age = (time % READING_FLOW.period) - READING_FLOW.handoff;
  return {
    charge: age >= -0.2 && age < 0 ? smooth((age + 0.2) / 0.2) : 0,
    wave: Math.max(0, Math.min(1, age / 0.18)),
    flash: age >= 0 && age < 0.18 ? (1 - age / 0.18) ** 2 : 0,
  };
}

// The head stays fast. Its travelled path retains a separate, slowly cooling wake.
export function launchWake(time: number) {
  const age = (time % READING_FLOW.period) - READING_FLOW.handoff;
  if (age < 0) return { length: 0, opacity: 0 };
  const phase = Math.min(1, age / READING_FLOW.launch);
  const beam = launchEnvelope(phase);
  return {
    length: Math.min(1, beam.tail - beam.offset),
    opacity:
      0.28 *
      smooth(phase / 0.2) *
      (1 - smooth((age - READING_FLOW.launch) / READING_FLOW.afterglow)),
  };
}
