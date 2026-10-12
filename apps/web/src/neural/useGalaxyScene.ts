import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { createGalaxy, GalaxyLabel } from '../galaxy/scene.ts';
import type { Focus, ReaderGraph } from '../types/graph.ts';
import type {
  Cluster,
  ReadingTrail as ReadingTrailData,
  TrailProjection,
  EnterTimeline,
} from '../types/reading.ts';
import type { useReadingHistory } from './useReadingHistory.ts';
import { MOTION } from '../motion/tokens.ts';
export interface GalaxyBindings {
  focus: Focus;
  setFocus: (focus: Focus) => void;
  preset?: string;
  expanded?: boolean;
  grouping?: string;
  groupCluster?: Cluster | null;
  reduced?: boolean;
  trail?: ReadingTrailData | null;
  reading?: ReturnType<typeof useReadingHistory>;
  visualFocus?: Focus;
}
interface Options {
  graph: ReaderGraph;
  workbenchVisible: boolean;
  host: RefObject<HTMLDivElement | null>;
  scene: RefObject<ReturnType<typeof createGalaxy> | null>;
  current: RefObject<GalaxyBindings>;
  readerTimeline: RefObject<EnterTimeline>;
  onClearCluster(): void;
}
/** Owns loading and disposal; all callbacks read the latest navigation bindings. */
export function useGalaxyScene({
  graph,
  workbenchVisible,
  host,
  scene,
  current,
  readerTimeline,
  onClearCluster,
}: Options) {
  const clearCluster = useRef(onClearCluster);
  clearCluster.current = onClearCluster;
  const [branchesReady, setBranchesReady] = useState(false);
  const [labels, setLabels] = useState<GalaxyLabel[]>([]);
  const [ready, setReady] = useState(false),
    [error, setError] = useState('');
  const [trailProjection, setTrailProjection] = useState<TrailProjection>({ nodes: [], edges: [] });
  useLayoutEffect(() => {
    // The dashboard needs no WebGL scene. Dispose it on entry and create it
    // only for the galaxy/reader; pause() stops motion, not rendering.
    setReady(false);
    setBranchesReady(false);
    setLabels([]);
    readerTimeline.current.progress = 0;
    if (readerTimeline.current.animation) readerTimeline.current.animation.currentTime = 0;
    if (workbenchVisible) return;
    let active = true,
      instance: ReturnType<typeof createGalaxy> | undefined;
    setError('');
    import('../galaxy/scene.ts')
      .then(({ createGalaxy }) => {
        if (!active) return;
        instance = createGalaxy(
          host.current!,
          graph,
          {
            onLabels: (next) => {
              if (active) setLabels(next);
            },
            onTrail: (next) => {
              if (active) setTrailProjection(next);
            },
            onReady: (value) => {
              if (active) setReady(value);
            },
            onBranchesReady: (value) => {
              if (!active) return;
              if (!value) {
                readerTimeline.current.progress = 0;
                if (readerTimeline.current.animation)
                  readerTimeline.current.animation.currentTime = 0;
              }
              setBranchesReady(value);
            },
            onEntryProgress: (progress) => {
              if (!active) return;
              readerTimeline.current.progress = progress;
              if (readerTimeline.current.animation)
                readerTimeline.current.animation.currentTime = progress * MOTION.morph;
            },
            onError: (message) => {
              if (active) {
                setError(message);
                readerTimeline.current.progress = 1;
                if (readerTimeline.current.animation)
                  readerTimeline.current.animation.currentTime = MOTION.morph;
              }
            },
            onReset: () => {
              clearCluster.current();
              current.current.setFocus({ mod: null, sel: null });
            },
            onSelect: (id) => {
              clearCluster.current();
              const navigation = current.current.reading!;
              const ancestor = navigation.path.slice(-3, -1).findLast((entry) => entry.id === id);
              if (ancestor && id !== current.current.focus.sel && current.current.trail?.live) {
                navigation.returnTo(ancestor.key);
                return;
              }
              const target = graph.index.get(id);
              if (target?.module) current.current.setFocus({ mod: target.module, sel: id });
            },
          },
          current.current.reduced!,
          current.current.preset,
        );
        scene.current = instance;
        const cluster = current.current.groupCluster;
        instance.focus(
          cluster ? null : current.current.visualFocus!.sel,
          cluster ? (cluster.category ?? null) : current.current.visualFocus!.mod,
          cluster?.tag,
          current.current.visualFocus!.sel,
        );
        instance.pause(current.current.reduced!);
        instance.expand(current.current.expanded!, current.current.grouping);
        instance.readingTrail(current.current.trail ?? null);
      })
      .catch(() => {
        if (active) {
          setError('当前浏览器无法显示三维星云，可通过下方搜索继续阅读。');
          readerTimeline.current.progress = 1;
          if (readerTimeline.current.animation)
            readerTimeline.current.animation.currentTime = MOTION.morph;
        }
      });
    return () => {
      active = false;
      instance?.dispose();
      scene.current = null;
    };
  }, [graph, workbenchVisible]);

  return { ready, branchesReady, labels, error, trailProjection };
}
