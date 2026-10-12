import type { GraphNode } from './vendor/types.ts';
import type { LayoutEngine } from './vendor/layout/LayoutEngine.ts';
import type { StylePreset } from './vendor/render/stylePresets.ts';
import type { CategoryLayout } from './categoryLayout.ts';
import type { ReadingTrail, TrailProjection } from '../types/reading.ts';
export interface GalaxyLabel {
  id: string;
  title: string;
  x: number;
  y: number;
  current?: boolean;
  preview?: boolean;
  path?: boolean;
  count?: number;
  color?: string;
  category?: boolean;
  opacity?: number;
  exiting?: boolean;
}
export interface GalaxyHooks {
  onReset(): void;
  onReady(ready: boolean): void;
  onLabels(labels: GalaxyLabel[]): void;
  onTrail?(projection: TrailProjection): void;
  onSelect(id: string): void;
  onCategory?(id: string): void;
  onBranchesReady?(ready: boolean): void;
  onEntryProgress?(progress: number): void;
  onError(message: string): void;
}
interface FrameRegion {
  width: number;
  height: number;
  left: number;
  top: number;
}
interface SceneTransition {
  from: Float32Array;
  to: Float32Array;
  anchor: number;
  anchorView: ReturnType<CameraDirector['captureAnchorView']>;
  framingView: ReturnType<CameraDirector['captureFramingView']>;
  elapsed: number;
  duration: number;
  expanding: boolean;
  blendFrom: number;
  morph: boolean;
  lookFrom: Record<string, number>;
}
import type { ReaderGraph } from '../types/graph.ts';
import { starCluster } from './starCluster.ts';
import { collectionLabel, collectionRegistry } from '../collections.ts';
import { MOTION, smooth } from '../motion/tokens.ts';
import { Color, Vector3 } from 'three';
import { AggregateRenderer } from './vendor/render/AggregateRenderer.ts';
import { CameraDirector } from './vendor/interactions/CameraDirector.ts';
import { WorkerForceLayout } from './vendor/layout/WorkerForceLayout.ts';
import { MainThreadForceLayout } from './vendor/layout/MainThreadForceLayout.ts';
import { seedPosition, seedRadius } from './vendor/data/seed.ts';
import { STYLE_PRESETS } from './vendor/render/stylePresets.ts';
import { TIERS } from './vendor/quality/tiers.ts';
import { galaxyData, galaxyFocus, readingFilter } from './data.ts';
import { categoryLayout, interpolateCategories, categoryEase } from './categoryLayout.ts';
import { CategoryEffects } from './categoryEffects.ts';
import { categoryStyle } from './categoryStyles.ts';
import { NebulaBackdrop } from './nebulaBackdrop.ts';

// A Dashboard round trip disposes WebGL, but settled layouts belong to the graph.
// Weak keys release them when a refreshed library replaces that graph.
const settledLayouts = new WeakMap<ReaderGraph, Map<string, Float32Array>>();

export function createGalaxy(
  container: HTMLElement,
  graph: ReaderGraph,
  hooks: GalaxyHooks,
  reduced: boolean,
  initialPreset = 'deepfield',
) {
  const data = galaxyData(graph);
  const nodeIndices = new Map(data.nodes.map((node, i) => [node.id, i]));
  const incidentLinks: number[][] = data.nodes.map(() => []);
  data.links.forEach((link, i) => {
    incidentLinks[link.source].push(i);
    if (link.target !== link.source) incidentLinks[link.target].push(i);
  });
  const framingRegion = container.querySelector('.galaxy-frame') || container;
  const radius = Math.max(45, seedRadius(data.nodes.length));
  const positions = new Float32Array(data.nodes.length * 3);
  data.nodes.forEach((node, i) => positions.set(seedPosition(node.id, radius), i * 3));
  const renderer = new AggregateRenderer(container, radius);
  const backdrop = new NebulaBackdrop(renderer.sceneRoot);
  const canvas = renderer.renderer.domElement;
  // Never expose seed coordinates or the provisional camera while layout settles.
  canvas.style.visibility = 'hidden';
  canvas.setAttribute('aria-label', '三维知识星云：拖动旋转，滚轮缩放；文档也可通过下方搜索打开');
  const camera = new CameraDirector(renderer.camera, canvas, {
    onFlyToSelected: () => applyFocus(true),
    onResetView: () => hooks.onReset(),
  });
  const colors = new Map(
    graph.modules.map((module) => {
      const color = new Color(module.color),
        hsl = { h: 0, s: 0, l: 0 };
      color.getHSL(hsl);
      return [module.id, color.setHSL(hsl.h, 0.32, 0.7)];
    }),
  );
  const collectionColors = new Map(
    collectionRegistry.collections.map((entry) => [entry.id, new Color(entry.color)]),
  );
  const neutralColor = new Color('#c7d3e4');
  let layout: LayoutEngine, preset: StylePreset;
  let width = 1,
    height = 1,
    frameWidth = 1,
    frameHeight = 1,
    disposed = false;
  let ready = false,
    paused = reduced,
    selected: string | null = null,
    category: string | null = null,
    tag: string | null = null;
  let readingIndex = -1,
    preparedReading = -1;
  let localReading: { indices: Set<number>; radius: number } | null = null;
  let previewIndex = -1;
  let readingTrail: ReadingTrail | null = null,
    trailIndices = new Set<number>();
  let focus = galaxyFocus(data, selected, category, tag);
  let raf = 0,
    previous = 0,
    labelTime = 0,
    hovered = -1;
  let down: { x: number; y: number; id: number; button: number } | null = null;
  let initialFramed = false,
    workerDeadline = 0;
  let grouping = 'category';
  const groupId = (node: GraphNode) =>
    grouping === 'collection' ? `collection:${node.collection}` : node.folderTop;
  let expanded = false;
  let transition: SceneTransition | null = null,
    overview: Float32Array | null = null,
    clusters: CategoryLayout | null = null,
    effects: CategoryEffects | null = null;
  let display: Float32Array | null = null,
    categoryBlend = 0;
  let presetFrom: Float32Array | null = null,
    pendingOverview: Float32Array | null = null,
    currentLook: Record<string, number> | null = null;
  const overviewCache = settledLayouts.get(graph) || new Map();
  settledLayouts.set(graph, overviewCache);
  let branchesReady = false;
  let hoveredCategory: string | null = null;
  let filteredLinks = false;
  let framing: FrameRegion | null = null,
    framingTween: {
      from: FrameRegion;
      to: FrameRegion;
      elapsed: number;
      duration?: number;
    } | null = null,
    readerLayoutDirty = false;
  const visibleLabels = new Map<string, GalaxyLabel>();
  const retiringEffects: { effect: CategoryEffects; elapsed: number }[] = [];
  function retireEffects() {
    if (!effects) return;
    if (reduced) effects.dispose();
    else retiringEffects.push({ effect: effects, elapsed: 0 });
    effects = null;
  }
  const scratch = new Vector3();

  function updateColors() {
    renderer.setColorFn((node) =>
      expanded && readingIndex < 0
        ? grouping === 'collection'
          ? collectionColors.get(node.collection) || neutralColor
          : colors.get(node.folderTop) || neutralColor
        : preset?.id === 'deepfield'
          ? neutralColor
          : colors.get(node.folderTop) || neutralColor,
    );
    renderer.setLinkColorFn(
      preset?.id === 'deepfield' && !expanded
        ? (node) => colors.get(node.folderTop) || neutralColor
        : null,
    );
    renderer.recolor();
  }
  function snapshot() {
    const result = new Float32Array(positions.length);
    data.nodes.forEach((_, i) => renderer.nodePosition(i, scratch).toArray(result, i * 3));
    return result;
  }
  function categoryLinkOpacity(blend: number) {
    if (readingIndex >= 0) blend = 0;
    // 首页分散布局的引用更长，需要补偿长度/深度衰减，避免未展开时完全隐没。
    const overviewOpacity = preset.id === 'deepfield' ? 0.36 : preset.look.linkOpacity * 0.35;
    return overviewOpacity * (1 - blend) + categoryStyle(preset.id).linkOpacity * blend;
  }
  function categorySpace(blend: number, from: Record<string, number> | null = null, progress = 1) {
    // Reading keeps the nebula appearance even while group labels are open.
    if (readingIndex >= 0) blend = 0;
    const style = categoryStyle(preset.id);
    const target = {
      nebula: preset.space.nebula * (1 - blend) + style.background * blend,
      clouds: preset.space.clusterClouds * (1 - blend),
      links: categoryLinkOpacity(blend),
      nodes:
        preset.look.nodeSize * (preset.id === 'deepfield' ? 1.45 : 2) * (1 - blend) +
        style.nodeScale * blend,
      stars: 0.34 * (1 - blend) + style.starfield * blend,
      bloom: preset.bloom.strength * 0.5,
      radius: preset.bloom.radius * 0.75,
      threshold: Math.max(0.3, preset.bloom.threshold),
      twinkle: preset.look.twinkle,
      curve: preset.id === 'deepfield' ? 0.3 * (1 - blend) + 0.55 * blend : preset.look.linkCurve,
    };
    const look = from
      ? Object.fromEntries(
          Object.entries(target).map(([key, value]) => [
            key,
            from[key] + (value - from[key]) * categoryEase(progress),
          ]),
        )
      : target;
    renderer.setSpace({
      fieldStars: 0,
      nebula: look.nebula * 0.05,
      clusterClouds: look.clouds * 0.08,
    });
    renderer.setLinkOpacity(readingTrail ? look.links * 0.2 : look.links);
    renderer.setCrystalLinks(preset.id === 'deepfield', clusters?.sphereRadius || radius);
    renderer.setNodeScale(look.nodes);
    renderer.setStarfieldIntensity(look.stars);
    renderer.setBloomParams({
      strength: look.bloom,
      radius: look.radius,
      threshold: look.threshold,
    });
    renderer.twinkleFreq = look.twinkle;
    if (look.curve !== currentLook?.curve) renderer.setLinkCurve(look.curve);
    currentLook = look;
    if (filteredLinks !== (readingIndex < 0 && blend > 0.005)) updateLinkFilter();
  }
  function updateLinkFilter() {
    filteredLinks = readingIndex < 0 && categoryBlend > 0.005;
    renderer.setLinkFilter(
      localReading
        ? (i) => {
            const link = data.links[i];
            return localReading.indices.has(link.source) && localReading.indices.has(link.target);
          }
        : filteredLinks
          ? (i) => {
              const link = data.links[i],
                a = groupId(data.nodes[link.source]),
                b = groupId(data.nodes[link.target]);
              return (
                a === b &&
                (localReading
                  ? localReading.indices.has(link.source) && localReading.indices.has(link.target)
                  : !category ||
                    category.startsWith('collection:') !== (grouping === 'collection') ||
                    a === category)
              );
            }
          : null,
    );
    updateSelectedLinks();
  }
  function updateSelectedLinks() {
    if (readingTrail) {
      renderer.setSelectedLinks([], []);
      return;
    }
    // Expanded categories stay visually independent even when a note is open.
    // The reader still exposes all actual incoming and outgoing references.
    const links = !focus.active && hovered >= 0 ? incidentLinks[hovered] : focus.links;
    renderer.setSelectedLinks(
      localReading
        ? links.filter((i) => {
            const link = data.links[i];
            return localReading.indices.has(link.source) && localReading.indices.has(link.target);
          })
        : filteredLinks
          ? focus.index >= 0 || (!focus.active && hovered >= 0)
            ? links.filter((i) => {
                const link = data.links[i];
                return (
                  groupId(data.nodes[link.source]) === groupId(data.nodes[link.target]) &&
                  (!localReading ||
                    (localReading.indices.has(link.source) &&
                      localReading.indices.has(link.target)))
                );
              })
            : []
          : links,
      [],
    );
  }
  function frameReading(point: Vector3, instant = false) {
    camera.cancelMotion();
    const radius = 60 / Math.min(1, frameWidth / frameHeight);
    if (instant || reduced) camera.setInitialFraming(point, radius);
    else
      camera.resetView(point, radius, () => {
        if (!paused) camera.beginFocusOrbit(null);
      });
  }
  function frameDestination(target: Float32Array, instant = false, capture = false) {
    // Layout changes keep the reader's node as the camera anchor, even when
    // its related list spans several categories or directories.
    if (readingIndex >= 0) {
      frameReading(new Vector3().fromArray(target, readingIndex * 3), instant);
      return;
    }
    const center = new Vector3();
    for (let i = 0; i < target.length; i += 3) center.add(new Vector3().fromArray(target, i));
    if (target.length) center.multiplyScalar(3 / target.length);
    if (expanded) center.set(0, 0, 0);
    let r = 30;
    for (let i = 0; i < target.length; i += 3)
      r = Math.max(r, new Vector3().fromArray(target, i).distanceTo(center));
    camera.cancelMotion();
    let fit = (r * 0.76) / Math.min(1, frameWidth / frameHeight);
    if (expanded && clusters && !clusters.spherical) {
      let horizontal = 30,
        vertical = 30,
        depth = 0;
      for (let i = 0; i < target.length; i += 3) {
        scratch.fromArray(target, i).sub(center);
        horizontal = Math.max(horizontal, Math.abs(scratch.dot(clusters.right)));
        vertical = Math.max(vertical, Math.abs(scratch.dot(clusters.up)));
        depth = Math.max(depth, Math.abs(scratch.dot(clusters.normal)));
      }
      fit =
        Math.max((horizontal + 25) / (frameWidth / frameHeight), vertical + 85) * 0.72 +
        depth * 0.12;
    }
    if (capture) return camera.captureFramingView(center, fit);
    if (instant || reduced) camera.setInitialFraming(center, fit);
    else camera.resetView(center, fit);
  }
  function expand(value: boolean, instant = false, morph = false, preserveView = false) {
    expanded = value;
    updateColors();
    if (!ready || !overview) return;
    hovered = -1;
    hoveredCategory = null;
    // Reading toggles only the node/link mask. Leave the camera, layout and
    // any in-flight reading transition untouched.
    if (readingIndex >= 0 && preserveView && !presetFrom) {
      categoryBlend = expanded ? 1 : 0;
      categorySpace(categoryBlend);
      applyFocus(false);
      return;
    }
    const from = snapshot();
    display = new Float32Array(from);
    const to = expanded && readingIndex < 0 ? clusters.positions : overview;
    const anchor = preserveView || morph ? readingIndex : -1;
    applyFocus(false);
    const anchorView =
      anchor >= 0
        ? camera.captureAnchorView(
            new Vector3().fromArray(from, anchor * 3),
            60 / Math.min(1, frameWidth / frameHeight),
          )
        : null;
    if (morph && framingTween) framingTween.duration = MOTION.morph;
    const framingView = morph && anchor < 0 ? frameDestination(to, false, true) : null;
    renderer.setDisplayPositions(display);
    if (
      anchor >= 0 ||
      framingView ||
      (preserveView && clusters.spherical && !selected && !category && !tag)
    )
      camera.cancelMotion();
    else frameDestination(to, instant);
    if (reduced || instant) {
      if (anchor >= 0)
        camera.updateAnchorView(new Vector3().fromArray(to, anchor * 3), anchorView, 1);
      if (framingView) camera.updateFramingView(framingView, 1);
      display.set(to);
      transition = null;
      categoryBlend = expanded ? 1 : 0;
      renderer.updatePositions();
      categorySpace(categoryBlend);
      if (readingTrail && readingIndex < 0) applyFocus(true);
    } else
      transition = {
        from,
        to,
        anchor,
        anchorView,
        framingView,
        elapsed: 0,
        duration: (morph ? MOTION.morph : expanded ? MOTION.expand : MOTION.collapse) / 1000,
        expanding: expanded,
        blendFrom: categoryBlend,
        morph,
        lookFrom: { ...currentLook },
      };
  }
  function stepCategories(dt: number) {
    let burst = -1;
    if (transition) {
      transition.elapsed += dt;
      const p = Math.min(1, transition.elapsed / transition.duration);
      interpolateCategories(
        transition.from,
        transition.to,
        p,
        transition.expanding && !transition.morph,
        display,
        clusters,
      );
      // Move and frame the reading group on the same animation clock.
      if (transition.anchor >= 0) {
        camera.updateAnchorView(
          scratch.fromArray(display, transition.anchor * 3),
          transition.anchorView,
          categoryEase(p),
        );
      }
      if (transition.framingView) camera.updateFramingView(transition.framingView, categoryEase(p));
      categoryBlend =
        transition.blendFrom +
        ((transition.expanding ? 1 : 0) - transition.blendFrom) * categoryEase(p);
      burst = transition.expanding && !transition.morph && !clusters.spherical ? p : -1;
      renderer.updatePositions();
      categorySpace(categoryBlend, transition.lookFrom, p);
      if (p === 1) {
        transition = null;
        if (!expanded) renderer.refreshClusterClouds();
        applyFocus(
          readingIndex < 0 && !expanded && Boolean(selected || category || tag || readingTrail),
        );
        if (readingIndex >= 0 && !paused && !reduced) camera.beginFocusOrbit(null);
      }
    }
    effects?.update(burst, display, reduced ? 10 : dt);
    for (let i = retiringEffects.length - 1; i >= 0; i--) {
      const old = retiringEffects[i];
      old.elapsed += dt;
      old.effect.update(-1, null, reduced ? 10 : dt);
      if (reduced || old.elapsed > (MOTION.enter / 1000) * 3) {
        old.effect.dispose();
        retiringEffects.splice(i, 1);
      }
    }
  }

  function bounds(indices?: number[]) {
    const points = (indices || data.nodes.map((_, i) => i)).map((i) =>
      renderer.nodePosition(i, new Vector3()),
    );
    const center = new Vector3();
    points.forEach((point) => center.add(point));
    if (points.length) center.divideScalar(points.length);
    let r = 30;
    for (const point of points) r = Math.max(r, point.distanceTo(center));
    // Small metadata groups need breathing room instead of a document-sized close-up.
    if (focus.index < 0 && (category || tag)) r = Math.max(r, 140);
    return { center, radius: (r * 0.76) / Math.min(1, frameWidth / frameHeight) };
  }
  function frame(instant = false, indices?: number[]) {
    const b = bounds(indices);
    camera.cancelMotion();
    if (instant || reduced) camera.setInitialFraming(b.center, b.radius);
    else camera.resetView(b.center, b.radius);
  }
  function applyFocus(move = false) {
    focus = galaxyFocus(data, selected, category, tag);
    localReading =
      expanded && readingIndex >= 0
        ? { indices: readingFilter(data, readingIndex, grouping), radius: 60 }
        : null;
    const previewGroup = expanded && readingIndex < 0 && !category && !tag ? hoveredCategory : null;
    renderer.setActiveNode(readingIndex);
    const weights = new Map<number, number>(
      readingTrail?.live
        ? readingTrail.nodes.map((node) => [nodeIndices.get(node.id), node.weight])
        : [],
    );
    renderer.setFocus(
      localReading
        ? (i) =>
            localReading.indices.has(i)
              ? i === readingIndex
                ? 1
                : readingTrail?.live
                  ? (weights.get(i) ?? 0.28)
                  : focus.bright.has(i)
                    ? 1
                    : 0.28
              : 0
        : readingTrail?.live
          ? (i) => (i === readingIndex ? 1 : (weights.get(i) ?? 0.28))
          : readingTrail && trailIndices.size
            ? (i) => (trailIndices.has(i) ? 1 : 0.16)
            : previewGroup
              ? (i) => (groupId(data.nodes[i]) === previewGroup ? 1 : 0.14)
              : focus.active
                ? (i) => (focus.bright.has(i) ? 1 : 0.28)
                : null,
    );
    updateLinkFilter();
    renderer.setLinkOpacity(
      readingTrail
        ? 0.025
        : expanded && readingIndex < 0 && category && focus.index < 0
          ? 0.16
          : categoryLinkOpacity(categoryBlend),
    );
    if (!ready || !move || transition || renderer.revealing || preparedReading >= 0) return;
    if (readingTrail && !readingTrail.live && trailIndices.size) frame(false, [...trailIndices]);
    else if (readingIndex >= 0 || focus.index >= 0) {
      const anchor = readingIndex >= 0 ? readingIndex : focus.index;
      camera.cancelMotion();
      if (readingTrail?.live) {
        camera.followReading(
          renderer.nodePosition(anchor, scratch),
          60 / Math.min(1, frameWidth / frameHeight),
          reduced,
        );
      } else if (reduced) frameReading(renderer.nodePosition(anchor, scratch), true);
      else
        camera.flyTo(
          renderer.nodePosition(anchor, scratch),
          Math.max(9, renderer.nodeRadius(anchor)),
          () => {
            if (!paused) camera.beginFocusOrbit(null);
          },
        );
    } else if (expanded && !category && !tag && clusters) frameDestination(clusters.positions);
    else frame(false, (category || tag) && focus.bright.size ? [...focus.bright] : undefined);
  }
  function fallback() {
    if (disposed || layout instanceof MainThreadForceLayout) return;
    layout?.dispose();
    layout = new MainThreadForceLayout();
    layout.init(data, positions, physics());
    workerDeadline = 0;
  }
  function physics() {
    return { charge: -preset.physics.repel, ...preset.physics, velocityDecay: 0.4 };
  }
  function setPreset(id: string) {
    if (preset?.id === id) return;
    const hadScene = Boolean(preset);
    branchesReady = false;
    hooks.onBranchesReady?.(false);
    presetFrom = hadScene ? snapshot() : null;
    camera.cancelMotion();
    transition = null;
    overview = null;
    retireEffects();
    hovered = -1;
    preset = STYLE_PRESETS.find((item) => item.id === id) || STYLE_PRESETS[0];
    camera.setFramingElev(preset.frameElevDeg || 18);
    ready = false;
    layout?.dispose();
    layout = null;
    workerDeadline = 0;
    // Keep separate destinations: the homepage sphere opens into the reader's
    // slightly flattened, volumetric nebula. Cache only within the same preset.
    pendingOverview = overviewCache.get(preset.id) || null;
    if (!pendingOverview && preset.id === 'deepfield') {
      pendingOverview = starCluster(
        data.nodes.map((node) => node.id),
        Math.max(55, Math.cbrt(data.nodes.length) * 28),
        1,
        {
          links: data.links.map((link) => ({
            source: data.nodes[link.source].id,
            target: data.nodes[link.target].id,
          })),
          groups: new Map(data.nodes.map((node) => [node.id, node.folderTop || ''])),
        },
      );
      overviewCache.set(preset.id, pendingOverview);
    }
    updateColors();
    // Keep the last frame visible while preparing a preset for the first time.
    // Later visits reuse its settled coordinates without restarting the worker.
    if (!hadScene) {
      hooks.onReady(false);
      renderer.setStarfieldEnabled(true);
      renderer.setNebulaTint('#526878', '#79515b');
      renderer.applyTier(width < 640 ? TIERS.mobile : TIERS.high, preset.bloom.strength);
      categorySpace(categoryBlend);
      renderer.setData(data, positions);
    } else renderer.setDisplayPositions(presetFrom);
    if (!pendingOverview) {
      try {
        const worker = new WorkerForceLayout();
        worker.onError = fallback;
        layout = worker;
        layout.init(data, positions, physics());
        workerDeadline = performance.now() + 5000;
      } catch {
        fallback();
      }
    }
    if (!initialFramed) {
      frame(true);
      initialFramed = true;
    }
  }
  function resize(direct = false) {
    const oldMobile = width < 640;
    const canvasChanged = width !== container.clientWidth || height !== container.clientHeight;
    width = Math.max(1, container.clientWidth);
    height = Math.max(1, container.clientHeight);
    const region = framingRegion.getBoundingClientRect(),
      viewport = container.getBoundingClientRect();
    frameWidth = Math.max(1, region.width);
    frameHeight = Math.max(1, region.height);
    const target = {
      width: frameWidth,
      height: frameHeight,
      left: region.left - viewport.left,
      top: region.top - viewport.top,
    };
    const destination = framingTween?.to || framing;
    if (
      !canvasChanged &&
      destination &&
      Object.keys(target).every((key) => target[key] === destination[key]) &&
      (!(direct || reduced) || !framingTween)
    )
      return;
    if (!framing || reduced || direct) {
      framing = target;
      framingTween = null;
    } else framingTween = { from: { ...framing }, to: target, elapsed: 0 };
    renderer.setFramingRegion(framing.width, framing.height, framing.left, framing.top);
    // Moving a reader edge changes the projection, not the canvas resolution.
    // Avoid reallocating render targets and restarting the focus flight per move.
    if (canvasChanged) renderer.resize(width, height);
    if (preset && oldMobile !== width < 640)
      renderer.applyTier(width < 640 ? TIERS.mobile : TIERS.high, preset.bloom.strength);
    if (direct && !canvasChanged) {
      readerLayoutDirty = true;
      return;
    }
    if (ready) {
      if (!selected && !category && !tag && overview) {
        clusters = categoryLayout(data, overview, {
          aspect: frameWidth / frameHeight,
          elevation: preset.frameElevDeg || 18,
          preset: preset.id,
          grouping,
        });
        retireEffects();
        effects = new CategoryEffects(renderer.sceneRoot, clusters.groups, data, colors);
        if (expanded) expand(true, reduced, true);
        else applyFocus(true);
      } else applyFocus(true);
    }
  }
  function labels(dt: number) {
    if (!ready || renderer.revealProgress < 0.22) {
      hooks.onLabels([]);
      hooks.onTrail?.({ nodes: [], edges: [] });
      return;
    }
    if (readingTrail) {
      const nodes = readingTrail.nodes.flatMap((node) => {
        const index = nodeIndices.get(node.id);
        if (index === undefined || (localReading && !localReading.indices.has(index))) return [];
        const point = renderer.projectNode(index, width, height);
        return point.behind
          ? []
          : [{ ...node, x: point.x, y: point.y, current: index === readingIndex }];
      });
      hooks.onTrail?.({ nodes, edges: readingTrail.edges, segments: readingTrail.segments });
    }
    const pathIndices = readingTrail?.live
      ? readingTrail.nodes
          .filter((node) => !node.transient)
          .map((node) => nodeIndices.get(node.id))
          .filter((i) => i !== undefined && (!localReading || localReading.indices.has(i)))
      : [];
    const chosen = [
      ...new Set([readingIndex, focus.index, hovered, previewIndex, ...pathIndices]),
    ].filter((i) => i >= 0);
    const result: GalaxyLabel[] = [];
    for (const i of chosen) {
      const p = renderer.projectNode(i, width, height);
      if (p.behind || p.x < 8 || p.x > width - 40 || p.y < 8 || p.y > height - 28) continue;
      result.push({
        id: data.nodes[i].id,
        title: data.nodes[i].name,
        x: p.x,
        y: p.y,
        current: i === readingIndex,
        preview: i === previewIndex,
        path: pathIndices.includes(i) && i !== readingIndex,
      });
    }
    if (expanded && !transition && clusters && (!readingTrail || readingTrail.live)) {
      const occupied: { left: number; right: number; top: number; bottom: number }[] = [];
      const ordered = [...clusters.groups].sort(
        (a, b) =>
          Number(b.id === (hoveredCategory || category)) -
            Number(a.id === (hoveredCategory || category)) || b.members.length - a.members.length,
      );
      for (const group of ordered) {
        if (readingIndex >= 0 && group.id !== groupId(data.nodes[readingIndex])) continue;
        const title =
          grouping === 'collection'
            ? collectionLabel(group.id.slice(11))
            : graph.modules.find((m) => m.id === group.id)?.title || '未分类';
        const labelCenter = localReading
          ? renderer.nodePosition(readingIndex, new Vector3())
          : new Vector3(...group.center);
        const p = (
          !localReading && group.labelPosition
            ? new Vector3(...group.labelPosition)
            : labelCenter.addScaledVector(clusters.up, (localReading?.radius || group.radius) + 12)
        ).project(renderer.camera);
        const x = ((p.x + 1) * width) / 2,
          y = ((1 - p.y) * height) / 2;
        if (p.z < -1 || p.z > 1 || x < 20 || x > width - 20 || y < 76 || y > height - 88) continue;
        const half = ((title.length || 3) * (frameWidth < 640 ? 11 : 13) + 52) / 2;
        const box = { left: x - half, right: x + half, top: y - 28, bottom: y + 4 };
        if (
          occupied.some(
            (r) =>
              box.left < r.right && box.right > r.left && box.top < r.bottom && box.bottom > r.top,
          )
        )
          continue;
        occupied.push(box);
        const color =
          grouping === 'collection'
            ? collectionColors.get(group.id.slice(11))
            : colors.get(group.id);
        result.push({
          id: group.id,
          title,
          count: group.members.length,
          color: color ? `#${color.getHexString()}` : '#c7d3e4',
          x,
          y,
          category: true,
        });
      }
    }
    const next = new Map(result.map((label) => [label.id, label]));
    for (const [id, old] of visibleLabels) {
      if (!next.has(id)) {
        old.opacity = Math.max(0, old.opacity - dt / (MOTION.exit / 1000));
        if (old.opacity === 0 || reduced) visibleLabels.delete(id);
      }
    }
    for (const label of result) {
      const opacity = reduced
        ? 1
        : Math.min(1, (visibleLabels.get(label.id)?.opacity || 0) + dt / (MOTION.enter / 1000));
      visibleLabels.set(label.id, { ...label, opacity });
    }
    hooks.onLabels(
      [...visibleLabels.values()].map((label) => ({ ...label, exiting: !next.has(label.id) })),
    );
  }
  function tick(now: number) {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    if (document.hidden) {
      previous = 0;
      return;
    }
    const dt = previous ? Math.min((now - previous) / 1000, MOTION.maxFrame / 1000) : 0;
    previous = now;
    if (workerDeadline && now > workerDeadline && !layout?.isSettled()) fallback();
    layout?.step();
    if (!ready && (pendingOverview || layout?.isSettled())) {
      // Sample the final reader/list footprint before fixing the birth camera.
      resize(!presetFrom);
      workerDeadline = 0;
      ready = true;
      if (pendingOverview) overview = pendingOverview;
      else {
        renderer.setDisplayPositions(null);
        renderer.updatePositions();
        overview = snapshot();
        overviewCache.set(preset.id, overview);
      }
      pendingOverview = null;
      renderer.refreshClusterClouds();
      clusters = categoryLayout(data, overview, {
        aspect: frameWidth / frameHeight,
        elevation: preset.frameElevDeg || 18,
        preset: preset.id,
        grouping,
      });
      effects = new CategoryEffects(renderer.sceneRoot, clusters.groups, data, colors);
      if (presetFrom) {
        renderer.setDisplayPositions(presetFrom);
        expand(expanded, reduced, true);
      } else {
        // Establish the final pose before the first visible frame. Restored readers
        // and expanded groups share the same birth sequence as a fresh overview.
        const target = expanded && readingIndex < 0 ? clusters.positions : overview;
        display = new Float32Array(target);
        renderer.setDisplayPositions(display);
        categoryBlend = expanded ? 1 : 0;
        categorySpace(categoryBlend);
        applyFocus(false);
        const anchor = readingIndex >= 0 ? readingIndex : focus.index;
        if (anchor >= 0) frameReading(new Vector3().fromArray(target, anchor * 3), true);
        else if (readingTrail && !readingTrail.live && trailIndices.size)
          frame(true, [...trailIndices]);
        else if ((category || tag) && focus.bright.size) frame(true, [...focus.bright]);
        else frameDestination(target, true);
        renderer.refreshClusterClouds();
        if (!reduced) renderer.playReveal(MOTION.expand, camera.target.clone());
      }
      const changedPreset = Boolean(presetFrom);
      presetFrom = null;
      if (changedPreset) applyFocus(Boolean(selected || category || tag || readingTrail));
      canvas.style.visibility = '';
      hooks.onReady(true);
    }
    // No invisible WebGL draws while the worker is settling the first layout.
    if (!ready && !presetFrom) return;
    if (framingTween && ready) {
      framingTween.elapsed += dt * 1000;
      const p = Math.min(1, framingTween.elapsed / (framingTween.duration || MOTION.layout)),
        k = smooth(p);
      for (const key of Object.keys(framing))
        framing[key] = framingTween.from[key] + (framingTween.to[key] - framingTween.from[key]) * k;
      renderer.setFramingRegion(framing.width, framing.height, framing.left, framing.top);
      if (p === 1) framingTween = null;
    }
    stepCategories(reduced ? 0 : dt);
    camera.cruiseEnabled =
      !paused && !reduced && ready && !transition && !renderer.revealing && !readingTrail;
    camera.cruiseSpeed = 0.5;
    camera.update(now, dt, paused || reduced ? 0 : dt);
    backdrop.update(
      renderer.camera,
      preset.id,
      readingIndex >= 0 ? 0 : categoryBlend,
      readingIndex >= 0,
      dt,
      reduced,
      ready || presetFrom ? renderer.revealProgress : 0,
    );
    renderer.render(paused || reduced ? 0 : dt, dt);
    hooks.onEntryProgress?.(
      ready
        ? transition?.morph
          ? Math.min(1, transition.elapsed / transition.duration)
          : renderer.revealProgress
        : 0,
    );
    // Publish only after a real frame has rendered and the central star is visible.
    if (!branchesReady && ready && renderer.revealProgress >= 0.22) {
      branchesReady = true;
      hooks.onBranchesReady?.(true);
    }
    if (readerLayoutDirty || now - labelTime > 32) {
      labels(Math.min((now - labelTime) / 1000, 0.05));
      labelTime = now;
      readerLayoutDirty = false;
    }
  }
  const pick = (event) => {
    const rect = canvas.getBoundingClientRect();
    return renderer.pickNearest(
      event.clientX - rect.left,
      event.clientY - rect.top,
      width,
      height,
      event.pointerType === 'touch' ? 24 : 15,
    );
  };
  const pointerDown = (event) => {
    down = { x: event.clientX, y: event.clientY, id: event.pointerId, button: event.button };
    if (hovered >= 0) {
      hovered = -1;
      updateSelectedLinks();
    }
  };
  const pointerUp = (event) => {
    const start = down;
    down = null;
    if (
      !start ||
      start.id !== event.pointerId ||
      start.button !== 0 ||
      !ready ||
      renderer.revealing ||
      transition ||
      Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5
    )
      return;
    const i = pick(event);
    if (i >= 0) hooks.onSelect(data.nodes[i].id);
  };
  const pointerMove = (event) => {
    if (!ready || renderer.revealing || transition || event.buttons) return;
    const next = pick(event);
    if (next !== hovered) {
      hovered = next;
      updateSelectedLinks();
    }
    canvas.style.cursor = hovered < 0 ? 'grab' : 'pointer';
  };
  const pointerLeave = () => {
    const hadHover = hovered >= 0;
    hovered = -1;
    down = null;
    if (hadHover) updateSelectedLinks();
  };
  const contextLost = (event) => {
    event.preventDefault();
    dispose();
    hooks.onError('三维画面已中断，请重新加载页面。文档仍可通过下方搜索阅读。');
  };
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerleave', pointerLeave);
  canvas.addEventListener('pointercancel', pointerLeave);
  canvas.addEventListener('webglcontextlost', contextLost);
  const observer = new ResizeObserver(() => resize());
  observer.observe(container);
  if (framingRegion !== container) observer.observe(framingRegion);
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    observer.disconnect();
    layout?.dispose();
    camera.dispose();
    effects?.dispose();
    canvas.removeEventListener('pointerdown', pointerDown);
    canvas.removeEventListener('pointerup', pointerUp);
    canvas.removeEventListener('pointermove', pointerMove);
    canvas.removeEventListener('pointerleave', pointerLeave);
    canvas.removeEventListener('pointercancel', pointerLeave);
    canvas.removeEventListener('webglcontextlost', contextLost);
    retiringEffects.forEach(({ effect }) => effect.dispose());
    backdrop.dispose();
    renderer.dispose();
    canvas.remove();
  }
  camera.setReducedMotion(reduced);
  renderer.setReducedMotion(reduced);
  try {
    resize();
    setPreset(initialPreset);
    raf = requestAnimationFrame(tick);
  } catch (error) {
    dispose();
    throw error;
  }
  return {
    readingTrail(value: ReadingTrail | null) {
      if (disposed) return;
      const wasLive = readingTrail?.live;
      readingTrail = value;
      trailIndices = new Set(
        value?.nodes.map((node) => nodeIndices.get(node.id)).filter((i) => i !== undefined),
      );
      if (!value) hooks.onTrail?.({ nodes: [], edges: [] });
      applyFocus(!value?.live || !wasLive);
    },
    prepareReadingTravel(id: string) {
      const index = nodeIndices.get(id);
      if (disposed || !ready || transition || index === undefined) return false;
      renderer.finishReveal();
      preparedReading = index;
      camera.followReading(
        renderer.nodePosition(index, scratch),
        60 / Math.min(1, frameWidth / frameHeight),
        reduced,
      );
      return true;
    },
    cancelReadingTravel() {
      if (disposed || preparedReading < 0) return;
      preparedReading = -1;
      applyFocus(true);
    },
    resizeReader() {
      if (!disposed) resize(true);
    },
    focus(
      sel: string | null,
      mod: string | null,
      selectedTag: string | null = null,
      readingId = sel,
    ) {
      if (disposed) return;
      const previousReading = readingIndex;
      if (
        ready &&
        (sel !== selected ||
          mod !== category ||
          selectedTag !== tag ||
          (nodeIndices.get(readingId) ?? -1) !== readingIndex)
      )
        renderer.finishReveal();
      selected = sel;
      category = mod;
      tag = selectedTag;
      readingIndex = nodeIndices.get(readingId) ?? -1;
      const arrived = preparedReading === readingIndex && preparedReading >= 0;
      if (readingIndex !== previousReading) preparedReading = -1;
      updateColors();
      applyFocus(!arrived && (readingIndex < 0 || readingIndex !== previousReading));
    },
    setReducedMotion(value: boolean) {
      if (disposed || reduced === value) return;
      reduced = value;
      paused = value;
      camera.setReducedMotion(value);
      renderer.setReducedMotion(value);
      if (value) {
        if (ready && overview) expand(expanded, true, true, readingIndex >= 0);
        resize();
        applyFocus(true);
      }
      renderer.setPreviewNode(previewIndex, !value);
    },
    pause(value: boolean) {
      if (disposed) return;
      paused = value;
      if (value) camera.cancelMotion();
    },
    preset(id: string) {
      if (!disposed) setPreset(id);
    },
    expand(value: boolean, nextGrouping = grouping) {
      if (disposed) return;
      const changed = grouping !== nextGrouping;
      grouping = nextGrouping;
      if (changed && overview) {
        clusters = categoryLayout(data, overview, {
          aspect: frameWidth / frameHeight,
          elevation: preset.frameElevDeg || 18,
          preset: preset.id,
          grouping,
        });
        retireEffects();
        effects = new CategoryEffects(renderer.sceneRoot, clusters.groups, data, colors);
        updateLinkFilter();
      }
      expand(
        value,
        false,
        Boolean(readingIndex >= 0 || transition || (changed && expanded) || clusters?.spherical),
        true,
      );
    },
    hoverCategory(id: string | null) {
      hoveredCategory = id;
      applyFocus(false);
    },
    previewNode(id: string | null) {
      if (disposed) return;
      previewIndex = nodeIndices.get(id) ?? -1;
      renderer.setPreviewNode(previewIndex, !reduced);
    },
    nodeAnchor(id: string) {
      const index = nodeIndices.get(id);
      if (disposed || !ready || !initialFramed || index === undefined) return null;
      // The reading document remains the origin even while the scene focuses a category/tag.
      const point = renderer.nodePosition(index, scratch).project(renderer.camera);
      if (point.z < -1 || point.z > 1) return null;
      const rect = canvas.getBoundingClientRect();
      return {
        x: rect.left + ((point.x + 1) * width) / 2,
        y: rect.top + ((1 - point.y) * height) / 2,
        flowTime: renderer.readingFlowTime,
      };
    },
    reset() {
      if (!disposed) {
        if (readingTrail && !readingTrail.live && trailIndices.size)
          frame(false, [...trailIndices]);
        else if (expanded && clusters) frameDestination(clusters.positions);
        else frame();
      }
    },
    replay() {
      if (!disposed && ready) {
        frame();
        if (!reduced) renderer.playReveal(MOTION.expand);
      }
    },
    dispose,
  };
}
