import {Color, Vector3} from 'three';
import {AggregateRenderer} from './vendor/render/AggregateRenderer';
import {CameraDirector} from './vendor/interactions/CameraDirector';
import {WorkerForceLayout} from './vendor/layout/WorkerForceLayout';
import {MainThreadForceLayout} from './vendor/layout/MainThreadForceLayout';
import {seedPosition, seedRadius} from './vendor/data/seed';
import {STYLE_PRESETS} from './vendor/render/stylePresets';
import {TIERS} from './vendor/quality/tiers';
import {galaxyData, galaxyFocus} from './data';

export function createGalaxy(container, graph, hooks, reduced) {
  const data = galaxyData(graph);
  const radius = Math.max(45, seedRadius(data.nodes.length));
  const positions = new Float32Array(data.nodes.length * 3);
  data.nodes.forEach((node, i) => positions.set(seedPosition(node.id, radius), i * 3));
  const renderer = new AggregateRenderer(container, radius);
  const canvas = renderer.renderer.domElement;
  canvas.setAttribute('aria-label', '三维知识星云：拖动旋转，滚轮缩放；文档也可通过搜索和分类列表打开');
  const camera = new CameraDirector(renderer.camera, canvas, {
    onFlyToSelected: () => applyFocus(true), onResetView: () => hooks.onReset(),
  });
  const colors = new Map(graph.modules.map(module => {
    const color = new Color(module.color), hsl = {}; color.getHSL(hsl);
    return [module.id, color.setHSL(hsl.h, 0.58, 0.65)];
  }));
  renderer.setColorFn(node => colors.get(node.folderTop) || new Color('#bccbdf'));
  let layout, preset, width = 1, height = 1, disposed = false;
  let ready = false, paused = reduced, selected = null, category = null;
  let focus = galaxyFocus(data, selected, category);
  let raf = 0, previous = 0, labelTime = 0, hovered = -1, down = null;
  let initialFramed = false, workerDeadline = 0;
  const scratch = new Vector3();

  function bounds(indices) {
    const points = (indices || data.nodes.map((_, i) => i)).map(i => renderer.nodePosition(i, new Vector3()));
    const center = new Vector3();
    points.forEach(point => center.add(point));
    if (points.length) center.divideScalar(points.length);
    let r = 30;
    for (const point of points) r = Math.max(r, point.distanceTo(center));
    return {center, radius: r * 0.76 / Math.min(1, width / height)};
  }
  function frame(instant = false, indices) {
    const b = bounds(indices);
    camera.cancelMotion();
    if (instant || reduced) camera.setInitialFraming(b.center, b.radius);
    else camera.resetView(b.center, b.radius);
  }
  function applyFocus(move = false) {
    focus = galaxyFocus(data, selected, category);
    renderer.setFocus(focus.active ? i => focus.bright.has(i) ? 1 : 0.12 : null);
    renderer.setSelectedLinks(focus.links, []);
    if (!ready || !move) return;
    if (focus.index >= 0) {
      camera.cancelMotion();
      if (reduced) frame(true, [...focus.bright]);
      else camera.flyTo(renderer.nodePosition(focus.index, scratch), Math.max(9, renderer.nodeRadius(focus.index)), () => {
        if (!paused) camera.beginFocusOrbit(null);
      });
    } else frame(false, category && focus.bright.size ? [...focus.bright] : undefined);
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
    camera.cancelMotion();
    hovered = -1; hooks.onLabels([]);
    preset = STYLE_PRESETS.find(item => item.id === id) || STYLE_PRESETS[0];
    renderer.setBloomParams(preset.bloom);
    renderer.setLinkOpacity(preset.look.linkOpacity);
    renderer.setLinkCurve(preset.look.linkCurve);
    renderer.setNodeScale(preset.look.nodeSize * 2);
    renderer.twinkleFreq = preset.look.twinkle;
    renderer.setStarfieldEnabled(true);
    renderer.setSpace({...preset.space, fieldStars: 0});
    renderer.setNebulaTint('#528ba5', '#9e77b7');
    renderer.applyTier(width < 640 ? TIERS.mobile : TIERS.high, preset.bloom.strength);
    camera.setFramingElev(preset.frameElevDeg || 18);
    ready = false;
    hooks.onReady(false);
    layout?.dispose();
    try {
      layout = new WorkerForceLayout();
      layout.onError = fallback;
      layout.init(data, positions, physics());
      workerDeadline = performance.now() + 5000;
    } catch { fallback(); }
    // Show a stable seed scene while the worker computes the opening layout.
    renderer.setData(data, positions);
    if (!initialFramed) { frame(true); initialFramed = true; }
  }
  function resize() {
    const oldMobile = width < 640;
    width = Math.max(1, container.clientWidth); height = Math.max(1, container.clientHeight);
    renderer.resize(width, height);
    if (preset && oldMobile !== (width < 640)) renderer.applyTier(width < 640 ? TIERS.mobile : TIERS.high, preset.bloom.strength);
    if (ready) applyFocus(true);
  }
  function labels() {
    const priority = [...data.nodes.keys()].filter(i => !focus.active || focus.bright.has(i))
      .sort((a, b) => data.nodes[b].degree - data.nodes[a].degree).slice(0, width < 640 ? 5 : 10);
    const chosen = [...new Set([focus.index, hovered, ...priority])].filter(i => i >= 0);
    const occupied = [];
    const result = [];
    for (const i of chosen) {
      const p = renderer.projectNode(i, width, height);
      if (p.behind || p.x < 8 || p.x > width - 40 || p.y < 8 || p.y > height - 28) continue;
      const important = i === focus.index || i === hovered;
      if (!important && occupied.some(q => Math.abs(q.x - p.x) < 165 && Math.abs(q.y - p.y) < 30)) continue;
      occupied.push(p);
      result.push({id: data.nodes[i].id, title: data.nodes[i].name, x: p.x, y: p.y, active: important});
    }
    hooks.onLabels(result);
  }
  function tick(now) {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    if (document.hidden) { previous = 0; return; }
    const dt = previous ? Math.min((now - previous) / 1000, 0.05) : 0;
    previous = now;
    if (workerDeadline && now > workerDeadline && !layout.isSettled()) fallback();
    const changed = layout.step();
    if (!ready && layout.isSettled()) {
      workerDeadline = 0; ready = true;
      renderer.updatePositions(); renderer.refreshClusterClouds();
      frame(!initialFramed || reduced);
      if (!reduced && !selected && !category) renderer.playReveal(2200);
      applyFocus(Boolean(selected || category));
      hooks.onReady(true);
    } else if (changed && ready && !paused) renderer.updatePositions();
    camera.cruiseEnabled = !paused && !reduced && ready;
    camera.cruiseSpeed = 0.5;
    camera.update(now, dt, paused || reduced ? 0 : dt);
    renderer.render(paused || reduced ? 0 : dt, dt);
    if (ready && now - labelTime > 60) { labels(); labelTime = now; }
  }
  const pick = event => {
    const rect = canvas.getBoundingClientRect();
    return renderer.pickNearest(event.clientX - rect.left, event.clientY - rect.top, width, height, event.pointerType === 'touch' ? 24 : 15);
  };
  const pointerDown = event => { down = {x: event.clientX, y: event.clientY, id: event.pointerId, button: event.button}; };
  const pointerUp = event => {
    const start = down; down = null;
    if (!start || start.id !== event.pointerId || start.button !== 0 || !ready || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) return;
    const i = pick(event); if (i >= 0) hooks.onSelect(data.nodes[i].id);
  };
  const pointerMove = event => { if (!ready || event.buttons) return; hovered = pick(event); canvas.style.cursor = hovered < 0 ? 'grab' : 'pointer'; };
  const pointerLeave = () => { hovered = -1; down = null; };
  const contextLost = event => { event.preventDefault(); dispose(); hooks.onError('三维画面已中断，请重新加载页面。文档仍可通过搜索和列表阅读。'); };
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerleave', pointerLeave);
  canvas.addEventListener('pointercancel', pointerLeave);
  canvas.addEventListener('webglcontextlost', contextLost);
  const observer = new ResizeObserver(resize); observer.observe(container);
  function dispose() {
    if (disposed) return;
    disposed = true; cancelAnimationFrame(raf); observer.disconnect(); layout?.dispose(); camera.dispose();
    canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointerup', pointerUp);
    canvas.removeEventListener('pointermove', pointerMove); canvas.removeEventListener('pointerleave', pointerLeave);
    canvas.removeEventListener('pointercancel', pointerLeave); canvas.removeEventListener('webglcontextlost', contextLost);
    renderer.dispose(); canvas.remove();
  }
  try { resize(); setPreset('nebula'); raf = requestAnimationFrame(tick); }
  catch (error) { dispose(); throw error; }
  return {
    focus(sel, mod) { if (disposed) return; selected = sel; category = mod; applyFocus(true); },
    pause(value) { if (disposed) return; paused = value; if (value) camera.cancelMotion(); },
    preset(id) { if (!disposed) setPreset(id); },
    reset() { if (!disposed) frame(); },
    replay() { if (!disposed && ready) { frame(); if (!reduced) renderer.playReveal(2200); } },
    dispose,
  };
}
