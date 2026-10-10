import {starCluster} from './starCluster.js';
import {collectionLabel} from '../collections.js';
import {MOTION, smooth} from '../motion/tokens.js';
import {Color, Vector3} from 'three';
import {AggregateRenderer} from './vendor/render/AggregateRenderer';
import {CameraDirector} from './vendor/interactions/CameraDirector';
import {WorkerForceLayout} from './vendor/layout/WorkerForceLayout';
import {MainThreadForceLayout} from './vendor/layout/MainThreadForceLayout';
import {seedPosition, seedRadius} from './vendor/data/seed';
import {STYLE_PRESETS} from './vendor/render/stylePresets';
import {TIERS} from './vendor/quality/tiers';
import {galaxyData, galaxyFocus} from './data';
import {categoryLayout, interpolateCategories, categoryEase} from './categoryLayout';
import {CategoryEffects} from './categoryEffects';
import {categoryStyle} from './categoryStyles';
import {NebulaBackdrop} from './nebulaBackdrop';

export function createGalaxy(container, graph, hooks, reduced, initialPreset = 'deepfield') {
  const data = galaxyData(graph);
  const nodeIndices = new Map(data.nodes.map((node, i) => [node.id, i]));
  const incidentLinks = data.nodes.map(() => []);
  data.links.forEach((link, i) => {
    incidentLinks[link.source].push(i);
    if (link.target !== link.source) incidentLinks[link.target].push(i);
  });
  const framingRegion = container.querySelector('.galaxy-frame') || container;
  const radius = Math.max(45, seedRadius(data.nodes.length));
  const positions = new Float32Array(data.nodes.length * 3);
  data.nodes.forEach((node, i) => positions.set(seedPosition(node.id, radius), i * 3));
  const renderer = new AggregateRenderer(container, radius);
  const backdrop = new NebulaBackdrop(renderer.scene);
  const canvas = renderer.renderer.domElement;
  canvas.setAttribute('aria-label', '三维知识星云：拖动旋转，滚轮缩放；文档也可通过下方搜索打开');
  const camera = new CameraDirector(renderer.camera, canvas, {
    onFlyToSelected: () => applyFocus(true), onResetView: () => hooks.onReset(),
  });
  const colors = new Map(graph.modules.map(module => {
    const color = new Color(module.color), hsl = {}; color.getHSL(hsl);
    return [module.id, color.setHSL(hsl.h, 0.32, 0.70)];
  }));
  const collectionColors = new Map([['inbox', new Color('#a4c5e8')], ['notes', new Color('#e1c49b')], ['readings', new Color('#b5d6c2')]]);
  const neutralColor = new Color('#c7d3e4');
  let layout, preset, width = 1, height = 1, frameWidth = 1, frameHeight = 1, disposed = false;
  let ready = false, paused = reduced, selected = null, category = null, tag = null;
  let readingIndex = -1;
  let previewIndex = -1;
  let readingTrail = null, trailIndices = new Set();
  let focus = galaxyFocus(data, selected, category, tag);
  let raf = 0, previous = 0, labelTime = 0, hovered = -1, down = null;
  let initialFramed = false, workerDeadline = 0;
  let grouping = 'category';
  const groupId = node => grouping === 'collection' ? `collection:${node.collection}` : node.folderTop;
  let expanded = false, transition = null, overview = null, clusters = null, effects = null;
  let display = null, categoryBlend = 0;
  let presetFrom = null, pendingOverview = null, currentLook = null;
  const overviewCache = new Map();
  let hoveredCategory = null;
  let filteredLinks = false;
  let framing = null, framingTween = null, readerLayoutDirty = false;
  const visibleLabels = new Map();
  const retiringEffects = [];
  function retireEffects() {
    if (!effects) return;
    if (reduced) effects.dispose();
    else retiringEffects.push({effect: effects, elapsed: 0});
    effects = null;
  }
  const scratch = new Vector3();

  function updateColors() {
    renderer.setColorFn(node => expanded
      ? grouping === 'collection' ? collectionColors.get(node.collection) || neutralColor : colors.get(node.folderTop) || neutralColor
      : preset?.id === 'deepfield' ? neutralColor : colors.get(node.folderTop) || neutralColor);
    renderer.recolor();
  }
  function snapshot() {
    const result = new Float32Array(positions.length);
    data.nodes.forEach((_, i) => renderer.nodePosition(i, scratch).toArray(result, i * 3));
    return result;
  }
  function categorySpace(blend, from = null, progress = 1) {
    const style = categoryStyle(preset.id);
    const target = {
      nebula: preset.space.nebula * (1 - blend) + style.background * blend,
      clouds: preset.space.clusterClouds * (1 - blend),
      links: preset.look.linkOpacity * .35 * (1 - blend) + style.linkOpacity * blend,
      nodes: preset.look.nodeSize * (preset.id === 'deepfield' ? 1.45 : 2) * (1 - blend) + style.nodeScale * blend,
      stars: .34 * (1 - blend) + style.starfield * blend,
      bloom: preset.bloom.strength * .5, radius: preset.bloom.radius * .75, threshold: Math.max(.3, preset.bloom.threshold),
      twinkle: preset.look.twinkle, curve: preset.look.linkCurve,
    };
    const look = from ? Object.fromEntries(Object.entries(target).map(([key, value]) => [key, from[key] + (value - from[key]) * categoryEase(progress)])) : target;
    renderer.setSpace({fieldStars: 0, nebula: look.nebula * .05, clusterClouds: look.clouds * .08});
    renderer.setLinkOpacity(readingTrail ? look.links * .2 : look.links);
    renderer.setNodeScale(look.nodes);
    renderer.setStarfieldIntensity(look.stars);
    renderer.setBloomParams({strength:look.bloom, radius:look.radius, threshold:look.threshold});
    renderer.twinkleFreq = look.twinkle;
    if (look.curve !== currentLook?.curve) renderer.setLinkCurve(look.curve);
    currentLook = look;
    if (filteredLinks !== (blend > .005)) updateLinkFilter();
  }
  function updateLinkFilter() {
    filteredLinks = categoryBlend > .005;
    renderer.setLinkFilter(filteredLinks ? i => {
      const link = data.links[i], a = groupId(data.nodes[link.source]), b = groupId(data.nodes[link.target]);
      return a === b && (!category || category.startsWith('collection:') !== (grouping === 'collection') || a === category);
    } : null);
    updateSelectedLinks();
  }
  function updateSelectedLinks() {
    if (readingTrail) {renderer.setSelectedLinks([], []); return;}
    // Expanded categories stay visually independent even when a note is open.
    // The reader still exposes all actual incoming and outgoing references.
    const links = !focus.active && hovered >= 0 ? incidentLinks[hovered] : focus.links;
    renderer.setSelectedLinks(filteredLinks
      ? focus.index >= 0 || (!focus.active && hovered >= 0) ? links.filter(i => {
        const link = data.links[i];
        return groupId(data.nodes[link.source]) === groupId(data.nodes[link.target]);
      }) : []
      : links, []);
  }
  function frameDestination(target, instant = false) {
    const center = new Vector3();
    for (let i = 0; i < target.length; i += 3) center.add(new Vector3().fromArray(target, i));
    if (target.length) center.multiplyScalar(3 / target.length);
    if (expanded) center.set(0, 0, 0);
    let r = 30;
    for (let i = 0; i < target.length; i += 3) r = Math.max(r, new Vector3().fromArray(target, i).distanceTo(center));
    camera.cancelMotion();
    let fit = r * .76 / Math.min(1, frameWidth / frameHeight);
    if (expanded && clusters) {
      let horizontal = 30, vertical = 30, depth = 0;
      for (let i = 0; i < target.length; i += 3) {
        scratch.fromArray(target, i).sub(center);
        horizontal = Math.max(horizontal, Math.abs(scratch.dot(clusters.right)));
        vertical = Math.max(vertical, Math.abs(scratch.dot(clusters.up)));
        depth = Math.max(depth, Math.abs(scratch.dot(clusters.normal)));
      }
      fit = Math.max((horizontal + 25) / (frameWidth / frameHeight), vertical + 85) * .72 + depth * .12;
    }
    if (instant || reduced) camera.setInitialFraming(center, fit);
    else camera.resetView(center, fit);
  }
  function expand(value, instant = false, morph = false) {
    expanded = value;
    updateColors();
    if (!ready || !overview) return;
    hovered = -1; hoveredCategory = null;
    const from = snapshot();
    display = new Float32Array(from);
    const to = expanded ? clusters.positions : overview;
    renderer.setDisplayPositions(display);
    frameDestination(to, instant);
    if (reduced || instant) {
      display.set(to); transition = null; categoryBlend = expanded ? 1 : 0;
      renderer.updatePositions(); categorySpace(categoryBlend);
      if (readingTrail) applyFocus(true);
    } else transition = {from, to, elapsed: 0, duration: (morph ? MOTION.morph : expanded ? MOTION.expand : MOTION.collapse) / 1000, expanding: expanded, blendFrom: categoryBlend, morph, lookFrom: {...currentLook}};
  }
  function stepCategories(dt) {
    let burst = -1;
    if (transition) {
      transition.elapsed += dt;
      const p = Math.min(1, transition.elapsed / transition.duration);
      interpolateCategories(transition.from, transition.to, p, transition.expanding && !transition.morph, display, clusters);
      categoryBlend = transition.blendFrom + ((transition.expanding ? 1 : 0) - transition.blendFrom) * categoryEase(p);
      burst = transition.expanding && !transition.morph ? p : -1;
      renderer.updatePositions(); categorySpace(categoryBlend, transition.lookFrom, p);
      if (p === 1) {
        transition = null;
        if (!expanded) renderer.refreshClusterClouds();
        applyFocus(Boolean(selected || category || tag || readingTrail));
      }
    }
    effects?.update(burst, display, reduced ? 10 : dt);
    for (let i = retiringEffects.length - 1; i >= 0; i--) {
      const old = retiringEffects[i]; old.elapsed += dt;
      old.effect.update(-1, null, reduced ? 10 : dt);
      if (reduced || old.elapsed > MOTION.enter / 1000 * 3) {old.effect.dispose(); retiringEffects.splice(i, 1);}
    }
  }

  function bounds(indices) {
    const points = (indices || data.nodes.map((_, i) => i)).map(i => renderer.nodePosition(i, new Vector3()));
    const center = new Vector3();
    points.forEach(point => center.add(point));
    if (points.length) center.divideScalar(points.length);
    let r = 30;
    for (const point of points) r = Math.max(r, point.distanceTo(center));
    // Small metadata groups need breathing room instead of a document-sized close-up.
    if (focus.index < 0 && (category || tag)) r = Math.max(r, 140);
    return {center, radius: r * 0.76 / Math.min(1, frameWidth / frameHeight)};
  }
  function frame(instant = false, indices) {
    const b = bounds(indices);
    camera.cancelMotion();
    if (instant || reduced) camera.setInitialFraming(b.center, b.radius);
    else camera.resetView(b.center, b.radius);
  }
  function applyFocus(move = false) {
    focus = galaxyFocus(data, selected, category, tag);
    renderer.setActiveNode(readingIndex);
    renderer.setFocus(readingTrail && trailIndices.size ? i => trailIndices.has(i) ? 1 : .16 : focus.active ? i => focus.bright.has(i) ? 1 : 0.28 : null);
    updateLinkFilter();
    renderer.setLinkOpacity(readingTrail ? .025 : expanded && category && focus.index < 0 ? .16 : preset.look.linkOpacity * .35 * (1 - categoryBlend) + categoryStyle(preset.id).linkOpacity * categoryBlend);
    if (!ready || !move || transition) return;
    if (readingTrail && trailIndices.size) frame(false, [...trailIndices]);
    else if (focus.index >= 0) {
      camera.cancelMotion();
      if (reduced) frame(true, [...focus.bright]);
      else camera.flyTo(renderer.nodePosition(focus.index, scratch), Math.max(9, renderer.nodeRadius(focus.index)), () => {
        if (!paused) camera.beginFocusOrbit(null);
      });
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
    return {charge: -preset.physics.repel, ...preset.physics, velocityDecay: 0.4};
  }
  function setPreset(id) {
    if (preset?.id === id) return;
    const hadScene = overviewCache.size > 0;
    presetFrom = hadScene ? snapshot() : null;
    camera.cancelMotion();
    transition = null; overview = null;
    retireEffects();
    hovered = -1;
    preset = STYLE_PRESETS.find(item => item.id === id) || STYLE_PRESETS[0];
    camera.setFramingElev(preset.frameElevDeg || 18);
    ready = false;
    layout?.dispose(); layout = null;
    workerDeadline = 0;
    pendingOverview = overviewCache.get(preset.id) || null;
    if (!pendingOverview && preset.id === 'deepfield') {
      pendingOverview = starCluster(data.nodes.map(node => node.id), Math.max(55, Math.cbrt(data.nodes.length) * 28));
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
        layout = new WorkerForceLayout();
        layout.onError = fallback;
        layout.init(data, positions, physics());
        workerDeadline = performance.now() + 5000;
      } catch { fallback(); }
    }
    if (!initialFramed) { frame(true); initialFramed = true; }
  }
  function resize(direct = false) {
    const oldMobile = width < 640;
    const canvasChanged = width !== container.clientWidth || height !== container.clientHeight;
    width = Math.max(1, container.clientWidth); height = Math.max(1, container.clientHeight);
    const region = framingRegion.getBoundingClientRect(), viewport = container.getBoundingClientRect();
    frameWidth = Math.max(1, region.width); frameHeight = Math.max(1, region.height);
    const target = {width: frameWidth, height: frameHeight, left: region.left - viewport.left, top: region.top - viewport.top};
    const destination = framingTween?.to || framing;
    if (!canvasChanged && destination && Object.keys(target).every(key => target[key] === destination[key]) && (!(direct || reduced) || !framingTween)) return;
    if (!framing || reduced || direct) {framing = target; framingTween = null;}
    else framingTween = {from: {...framing}, to: target, elapsed: 0};
    renderer.setFramingRegion(framing.width, framing.height, framing.left, framing.top);
    // Moving a reader edge changes the projection, not the canvas resolution.
    // Avoid reallocating render targets and restarting the focus flight per move.
    if (canvasChanged) renderer.resize(width, height);
    if (preset && oldMobile !== (width < 640)) renderer.applyTier(width < 640 ? TIERS.mobile : TIERS.high, preset.bloom.strength);
    if (direct && !canvasChanged) {readerLayoutDirty = true; return;}
    if (ready) {
      if (!selected && !category && !tag && overview) {
        clusters = categoryLayout(data, overview, {aspect: frameWidth / frameHeight, elevation: preset.frameElevDeg || 18, preset: preset.id, grouping});
        retireEffects(); effects = new CategoryEffects(renderer.scene, clusters.groups, data, colors);
        if (expanded) expand(true, reduced, true);
        else applyFocus(true);
      }
      else applyFocus(true);
    }
  }
  function labels(dt) {
    if (readingTrail) {
      const nodes = readingTrail.nodes.flatMap(node => {
        const index = nodeIndices.get(node.id);
        if (index === undefined) return [];
        const point = renderer.projectNode(index, width, height);
        return point.behind ? [] : [{...node, x: point.x, y: point.y, current: index === readingIndex}];
      });
      hooks.onTrail?.({nodes, edges: readingTrail.edges, segments: readingTrail.segments});
    }
    const chosen = [...new Set([readingIndex, focus.index, hovered, previewIndex])].filter(i => i >= 0);
    const result = [];
    for (const i of chosen) {
      const p = renderer.projectNode(i, width, height);
      if (p.behind || p.x < 8 || p.x > width - 40 || p.y < 8 || p.y > height - 28) continue;
      result.push({id: data.nodes[i].id, title: data.nodes[i].name, x: p.x, y: p.y, current: i === readingIndex, preview: i === previewIndex});
    }
    if (expanded && !transition && !selected && clusters && !readingTrail) {
      const occupied = [];
      const ordered = [...clusters.groups].sort((a,b) => Number(b.id === (hoveredCategory || category)) - Number(a.id === (hoveredCategory || category)) || b.members.length - a.members.length);
      for (const group of ordered) {
        const title = grouping === 'collection' ? collectionLabel(group.id.slice(11)) : graph.modules.find(m => m.id === group.id)?.title || '未分类';
        const p = new Vector3(...group.center).addScaledVector(clusters.up, group.radius + 12).project(renderer.camera);
        const x = (p.x + 1) * width / 2, y = (1 - p.y) * height / 2;
        if (p.z < -1 || p.z > 1 || x < 20 || x > width - 20 || y < 76 || y > height - 88) continue;
        const half = ((title.length || 3) * (frameWidth < 640 ? 11 : 13) + 52) / 2;
        const box = {left:x-half,right:x+half,top:y-28,bottom:y+4};
        if (occupied.some(r => box.left < r.right && box.right > r.left && box.top < r.bottom && box.bottom > r.top)) continue;
        occupied.push(box);
        const color = grouping === 'collection' ? collectionColors.get(group.id.slice(11)) : colors.get(group.id);
        result.push({id: group.id, title, count: group.members.length, color: color ? `#${color.getHexString()}` : '#c7d3e4', x, y, category: true});
      }
    }
    const next = new Map(result.map(label => [label.id, label]));
    for (const [id, old] of visibleLabels) {
      if (!next.has(id)) { old.opacity = Math.max(0, old.opacity - dt / (MOTION.exit / 1000)); if (old.opacity === 0 || reduced) visibleLabels.delete(id); }
    }
    for (const label of result) {
      const opacity = reduced ? 1 : Math.min(1, (visibleLabels.get(label.id)?.opacity || 0) + dt / (MOTION.enter / 1000));
      visibleLabels.set(label.id, {...label, opacity});
    }
    hooks.onLabels([...visibleLabels.values()].map(label => ({...label, exiting: !next.has(label.id)})));
  }
  function tick(now) {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    if (document.hidden) { previous = 0; return; }
    const dt = previous ? Math.min((now - previous) / 1000, MOTION.maxFrame / 1000) : 0;
    previous = now;
    if (workerDeadline && now > workerDeadline && !layout?.isSettled()) fallback();
    layout?.step();
    if (!ready && (pendingOverview || layout?.isSettled())) {
      workerDeadline = 0; ready = true;
      if (pendingOverview) overview = pendingOverview;
      else {
        renderer.setDisplayPositions(null);
        renderer.updatePositions();
        overview = snapshot();
        overviewCache.set(preset.id, overview);
      }
      pendingOverview = null;
      renderer.refreshClusterClouds();
      clusters = categoryLayout(data, overview, {aspect: frameWidth / frameHeight, elevation: preset.frameElevDeg || 18, preset: preset.id, grouping});
      effects = new CategoryEffects(renderer.scene, clusters.groups, data, colors);
      if (presetFrom) {
        renderer.setDisplayPositions(presetFrom);
        expand(expanded, reduced, true);
      } else if (expanded) expand(true, reduced, true);
      else {
        renderer.setDisplayPositions(overview); renderer.updatePositions();
        frame(!initialFramed || reduced);
        if (!reduced && !selected && !category && !tag) renderer.playReveal(MOTION.expand);
      }
      presetFrom = null;
      applyFocus(Boolean(selected || category || tag || readingTrail));
      hooks.onReady(true);
    }
    if (framingTween) {
      framingTween.elapsed += dt * 1000;
      const p = Math.min(1, framingTween.elapsed / MOTION.layout), k = smooth(p);
      for (const key of Object.keys(framing)) framing[key] = framingTween.from[key] + (framingTween.to[key] - framingTween.from[key]) * k;
      renderer.setFramingRegion(framing.width, framing.height, framing.left, framing.top);
      if (p === 1) framingTween = null;
    }
    stepCategories(reduced ? 0 : dt);
    camera.cruiseEnabled = !paused && !reduced && ready && !transition && !readingTrail;
    camera.cruiseSpeed = 0.5;
    camera.update(now, dt, paused || reduced ? 0 : dt);
    backdrop.update(renderer.camera, preset.id, categoryBlend, readingIndex >= 0, dt, reduced);
    renderer.render(paused || reduced ? 0 : dt, dt);
    if (readerLayoutDirty || now - labelTime > 32) { labels(Math.min((now - labelTime) / 1000, .05)); labelTime = now; readerLayoutDirty = false; }
  }
  const pick = event => {
    const rect = canvas.getBoundingClientRect();
    return renderer.pickNearest(event.clientX - rect.left, event.clientY - rect.top, width, height, event.pointerType === 'touch' ? 24 : 15);
  };
  const pointerDown = event => {
    down = {x: event.clientX, y: event.clientY, id: event.pointerId, button: event.button};
    if (hovered >= 0) { hovered = -1; updateSelectedLinks(); }
  };
  const pointerUp = event => {
    const start = down; down = null;
    if (!start || start.id !== event.pointerId || start.button !== 0 || !ready || transition || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) return;
    const i = pick(event); if (i >= 0) hooks.onSelect(data.nodes[i].id);
  };
  const pointerMove = event => {
    if (!ready || transition || event.buttons) return;
    const next = pick(event);
    if (next !== hovered) { hovered = next; updateSelectedLinks(); }
    canvas.style.cursor = hovered < 0 ? 'grab' : 'pointer';
  };
  const pointerLeave = () => {
    const hadHover = hovered >= 0;
    hovered = -1; down = null;
    if (hadHover) updateSelectedLinks();
  };
  const contextLost = event => { event.preventDefault(); dispose(); hooks.onError('三维画面已中断，请重新加载页面。文档仍可通过下方搜索阅读。'); };
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerleave', pointerLeave);
  canvas.addEventListener('pointercancel', pointerLeave);
  canvas.addEventListener('webglcontextlost', contextLost);
  const observer = new ResizeObserver(() => resize()); observer.observe(container);
  if (framingRegion !== container) observer.observe(framingRegion);
  function dispose() {
    if (disposed) return;
    disposed = true; cancelAnimationFrame(raf); observer.disconnect(); layout?.dispose(); camera.dispose(); effects?.dispose();
    canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointerup', pointerUp);
    canvas.removeEventListener('pointermove', pointerMove); canvas.removeEventListener('pointerleave', pointerLeave);
    canvas.removeEventListener('pointercancel', pointerLeave); canvas.removeEventListener('webglcontextlost', contextLost);
    retiringEffects.forEach(({effect}) => effect.dispose());
    backdrop.dispose(); renderer.dispose(); canvas.remove();
  }
  camera.setReducedMotion(reduced); renderer.setReducedMotion(reduced);
  try { resize(); setPreset(initialPreset); raf = requestAnimationFrame(tick); }
  catch (error) { dispose(); throw error; }
  return {
    readingTrail(value) {
      if (disposed) return;
      readingTrail = value;
      trailIndices = new Set(value?.nodes.map(node => nodeIndices.get(node.id)).filter(i => i !== undefined));
      if (!value) hooks.onTrail?.({nodes: [], edges: []});
      applyFocus(true);
    },
    resizeReader() { if (!disposed) resize(true); },
    focus(sel, mod, selectedTag = null, readingId = sel) {
      if (disposed) return;
      selected = sel; category = mod; tag = selectedTag;
      readingIndex = nodeIndices.get(readingId) ?? -1;
      applyFocus(true);
    },
    setReducedMotion(value) {
      if (disposed || reduced === value) return;
      reduced = value; paused = value;
      camera.setReducedMotion(value); renderer.setReducedMotion(value);
      if (value) {
        if (ready && overview) expand(expanded, true);
        resize(); applyFocus(true);
      }
      renderer.setPreviewNode(previewIndex, !value);
    },
    pause(value) { if (disposed) return; paused = value; if (value) camera.cancelMotion(); },
    preset(id) { if (!disposed) setPreset(id); },
    expand(value, nextGrouping = grouping) {
      if (disposed) return;
      const changed = grouping !== nextGrouping;
      grouping = nextGrouping;
      if (changed && overview) {
        clusters = categoryLayout(data, overview, {aspect: frameWidth / frameHeight, elevation: preset.frameElevDeg || 18, preset: preset.id, grouping});
        retireEffects(); effects = new CategoryEffects(renderer.scene, clusters.groups, data, colors);
        updateLinkFilter();
      }
      expand(value, false, changed && expanded);
    },
    hoverCategory(id) { hoveredCategory = id; },
    previewNode(id) {
      if (disposed) return;
      previewIndex = nodeIndices.get(id) ?? -1;
      renderer.setPreviewNode(previewIndex, !reduced);
    },
    nodeAnchor(id) {
      const index = nodeIndices.get(id);
      if (disposed || !initialFramed || index === undefined) return null;
      // The reading document remains the origin even while the scene focuses a category/tag.
      const point = renderer.nodePosition(index, scratch).project(renderer.camera);
      if (point.z < -1 || point.z > 1) return null;
      const rect = canvas.getBoundingClientRect();
      return {x:rect.left + (point.x + 1) * width / 2, y:rect.top + (1 - point.y) * height / 2};
    },
    reset() { if (!disposed) { if (readingTrail && trailIndices.size) frame(false, [...trailIndices]); else if (expanded && clusters) frameDestination(clusters.positions); else frame(); } },
    replay() { if (!disposed && ready) { frame(); if (!reduced) renderer.playReveal(MOTION.expand); } },
    dispose,
  };
}
