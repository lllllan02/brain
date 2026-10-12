import type { Flight, NodeAnchor } from '../types/ui.ts';
import React, { useLayoutEffect, useRef } from 'react';
import { cardFlight } from './card-flight.ts';
import './card-to-star.css';

// The endpoint is reprojected every frame: camera movement cannot detach the
// arriving star from the real document node. A newer click cancels this flight.
export function CardToStar({
  flight,
  getAnchor,
  onReveal,
  onFinish,
  reduced,
}: {
  flight: Flight | null;
  getAnchor: NodeAnchor;
  onReveal(key: string): void;
  onFinish(key: string): void;
  reduced: boolean;
}) {
  const root = useRef(null);
  useLayoutEffect(() => {
    if (!flight || reduced) {
      if (flight) onFinish(flight.key);
      return;
    }
    const element = root.current;
    const title = element.querySelector('.card-flight-title');
    const star = element.querySelector('.card-flight-star');
    const arrival = element.querySelector('.card-flight-arrival');
    const tail = element.querySelector('path');
    let raf,
      started = null,
      waitingSince = null,
      lastTarget = null,
      points = [],
      revealed = false;
    const update = (now) => {
      if (document.hidden) {
        onFinish(flight.key);
        return;
      }
      waitingSince ??= now;
      lastTarget = getAnchor(flight.id) || lastTarget;
      // No guessed landing point when WebGL is unavailable or the star is behind us.
      if (!lastTarget) {
        if (now - waitingSince > 650) {
          onFinish(flight.key);
          return;
        }
        raf = requestAnimationFrame(update);
        return;
      }
      started ??= now;
      const elapsed = now - started;
      // Overlap the incoming branches with the flight, on this same clock.
      if (!revealed && elapsed >= 260) {
        revealed = true;
        onReveal(flight.key);
      }
      const state = cardFlight(flight, lastTarget, elapsed);
      title.style.transform = `translate(${state.x}px,${state.y}px) translate(-50%,-50%) scale(${state.scale})`;
      title.style.opacity = state.textOpacity;
      star.style.transform = `translate(${state.x}px,${state.y}px) translate(-50%,-50%) scale(${state.starScale})`;
      star.style.opacity = state.starOpacity;
      arrival.style.transform = `translate(${lastTarget.x}px,${lastTarget.y}px) translate(-50%,-50%) scale(${state.ringScale})`;
      arrival.style.opacity = state.ringOpacity;
      points.push({ x: state.x, y: state.y, time: elapsed });
      points = points.filter((point) => elapsed - point.time < 110);
      tail.setAttribute(
        'd',
        points.map((point, index) => `${index ? 'L' : 'M'}${point.x},${point.y}`).join(' '),
      );
      tail.style.opacity = state.starOpacity * 0.45;
      if (elapsed < 800) raf = requestAnimationFrame(update);
      else onFinish(flight.key);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [flight, getAnchor, onReveal, onFinish, reduced]);
  if (!flight || reduced) return null;
  return (
    <div ref={root} className="card-flight" aria-hidden="true">
      <svg>
        <path />
      </svg>
      <div
        className="card-flight-title"
        style={{
          width: flight.width,
          fontSize: flight.fontSize,
          fontFamily: flight.fontFamily,
          color: flight.color,
        }}
      >
        {flight.title}
      </div>
      <i className="card-flight-star" />
      <i className="card-flight-arrival" />
    </div>
  );
}
