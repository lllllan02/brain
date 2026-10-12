import React, { type RefObject, type Dispatch, type SetStateAction } from 'react';
import type { createGalaxy, GalaxyLabel } from '../galaxy/scene.ts';
import type { Focus } from '../types/graph.ts';
import type { ReaderCluster } from '../types/reading.ts';
import type { ReadingController } from '../types/ui.ts';
interface Props {
  labels: GalaxyLabel[];
  ready: boolean;
  scene: RefObject<ReturnType<typeof createGalaxy> | null>;
  focus: Focus;
  reading: ReadingController;
  setFocus(focus: Focus): void;
  setReaderCluster: Dispatch<SetStateAction<ReaderCluster | null>>;
}
export function GalaxyLabels({
  labels,
  ready,
  scene,
  focus,
  reading,
  setFocus,
  setReaderCluster,
}: Props) {
  return (
    <div className="galaxy-labels">
      {ready &&
        labels.map((label) =>
          label.category ? (
            <button
              key={label.id}
              className="galaxy-category-label"
              style={{
                left: label.x,
                top: label.y,
                opacity: label.opacity,
                '--group-color': label.color,
                pointerEvents: label.exiting ? 'none' : undefined,
              }}
              onPointerEnter={() => scene.current?.hoverCategory(label.id)}
              onPointerLeave={() => scene.current?.hoverCategory(null)}
              onFocus={() => scene.current?.hoverCategory(label.id)}
              onBlur={() => scene.current?.hoverCategory(null)}
              onClick={() =>
                focus.sel
                  ? setReaderCluster({ owner: focus.sel, value: { category: label.id } })
                  : setFocus({ mod: label.id, sel: null })
              }
              aria-label={`查看${label.title}${label.id.startsWith('collection:') ? '目录' : '分类'}`}
            >
              <i aria-hidden="true" />
              {label.title}
              <small>{label.count}</small>
            </button>
          ) : (
            <React.Fragment key={label.id}>
              {label.current && (
                <svg
                  className="galaxy-current-marker"
                  aria-hidden="true"
                  viewBox="-20 -20 40 40"
                  style={{
                    left: label.x,
                    top: label.y,
                    opacity: label.opacity,
                    pointerEvents: label.exiting ? 'none' : undefined,
                  }}
                >
                  <path d="M -8 -17 H -17 V -8 M 8 -17 H 17 V -8 M -8 17 H -17 V 8 M 8 17 H 17 V 8" />
                </svg>
              )}
              {label.path ? (
                <button
                  type="button"
                  className="galaxy-label is-path"
                  title={`返回：${label.title}`}
                  tabIndex={label.exiting ? -1 : 0}
                  onClick={() => {
                    const entry = reading.path
                      .slice(-3, -1)
                      .findLast((item) => item.id === label.id);
                    if (entry) reading.returnTo(entry.key);
                  }}
                  style={{
                    left: label.x,
                    top: label.y,
                    opacity: label.opacity,
                    pointerEvents: label.exiting ? 'none' : undefined,
                  }}
                >
                  {label.title}
                </button>
              ) : (
                <span
                  className={`galaxy-label${label.current ? ' is-current' : ''}${label.preview ? ' is-preview' : ''}`}
                  aria-hidden="true"
                  style={{ left: label.x, top: label.y, opacity: label.opacity }}
                >
                  {label.title}
                </span>
              )}
            </React.Fragment>
          ),
        )}
    </div>
  );
}
