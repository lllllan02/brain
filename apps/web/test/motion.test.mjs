import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {Scene, Color, BufferGeometry, BufferAttribute} from 'three';
import {damp, curveSamples, pointAlongCurve} from '../src/motion/tokens.js';
import {CategoryEffects} from '../src/galaxy/categoryEffects.js';

test('阻尼在 30、60、120 帧下经过相同时间到达相同位置', () => {
  const results = [30, 60, 120].map(fps => {
    let position = 0;
    for (let i = 0; i < fps; i++) position += (1 - position) * damp(1 / fps, .16);
    return position;
  });
  assert.ok(Math.max(...results) - Math.min(...results) < 1e-12);
  assert.equal(damp(0, .16), 0);
});

test('光点沿弯曲连线近似匀速移动，双向路径端点精确，退化曲线无 NaN', () => {
  for (const curve of [
    {x: 0, y: 0, endX: 400, endY: 600, bend: 220},
    {x: 180, y: 100, endX: 140, endY: 200, bend: 28},
    {x: 0, y: 0, endX: 0, endY: 0, bend: 0},
  ]) {
    const samples = curveSamples(curve);
    assert.deepEqual(pointAlongCurve(samples, 0), {x: curve.x, y: curve.y});
    assert.deepEqual(pointAlongCurve(samples, 1), {x: curve.endX, y: curve.endY});
    const points = Array.from({length: 101}, (_, i) => pointAlongCurve(samples, i / 100));
    const steps = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
    assert.ok(steps.every(Number.isFinite));
    if (samples.length) assert.ok(Math.max(...steps) - Math.min(...steps) < samples.length / 100 * .08);
    assert.deepEqual(pointAlongCurve(samples, -1), points[0]);
    assert.deepEqual(pointAlongCurve(samples, 2), points[100]);
  }
});

test('分类光迹以零亮度起步，被打断后渐隐并释放资源', () => {
  const scene = new Scene();
  const effect = new CategoryEffects(scene, [{center:[100,0,0],radius:30}], {nodes:[{folderTop:'a'}]}, new Map([['a',new Color('white')]]));
  const positions = new Float32Array([30, 10, 0]);
  effect.update(.160001, positions, 1 / 60);
  assert.ok(effect.burst.material.opacity < .001);
  effect.update(.4, positions, 1 / 60);
  const before = effect.burst.material.opacity;
  effect.update(-1, positions, 1 / 60);
  assert.ok(effect.burst.material.opacity > 0 && effect.burst.material.opacity < before);
  for (let i = 0; i < 120; i++) effect.update(-1, positions, 1 / 60);
  assert.ok(effect.burst.material.opacity < .001);
  assert.equal(effect.burst.visible, false);
  effect.dispose();
  assert.equal(scene.children.length, 0);
});

test('选中与过滤连线保留中途亮度，反向操作连续，减少动态效果立即完成', async () => {
  const server = await createServer({configFile:false, optimizeDeps:{noDiscovery:true}, server:{middlewareMode:true,hmr:false,ws:false}});
  try {
    const {AggregateRenderer} = await server.ssrLoadModule('/src/galaxy/vendor/render/AggregateRenderer.ts');
    // Exercise the production fade logic without requiring a WebGL context.
    const renderer = Object.create(AggregateRenderer.prototype);
    const geometry = () => new BufferGeometry().setAttribute('color', new BufferAttribute(new Float32Array(8).fill(1), 4));
    Object.assign(renderer, {
      reducedMotion:false, linkK:1, linkGeometry:geometry(),
      linkColorsDirty:true, linkWeights:new Float32Array([1]), linkFilter:()=>false,
      selGeometry:geometry(), selectionColorsDirty:true,
      selLinkIdx:[0], selectionWeights:new Map([[0,1]]), selectionTargets:new Set(), linkMaterial:null,
    });
    renderer.stepLinkWeights(.05);
    const middle = renderer.selectionWeights.get(0);
    assert.ok(middle > 0 && middle < 1);
    renderer.selectionTargets.add(0); renderer.linkFilter = null;
    renderer.stepLinkWeights(0);
    assert.equal(renderer.selectionWeights.get(0), middle);
    renderer.stepLinkWeights(.05);
    assert.ok(renderer.selectionWeights.get(0) > middle);
    renderer.reducedMotion = true; renderer.selectionTargets.clear(); renderer.linkFilter = () => false;
    renderer.stepLinkWeights(0);
    assert.equal(renderer.selectionWeights.has(0), false);
    assert.equal(renderer.linkWeights[0], 0);
    assert.equal(renderer.selGeometry.attributes.color.array[3], 0);
    assert.equal(renderer.selGeometry.attributes.color.array[7], 0);
    assert.equal(renderer.selGeometry.attributes.color.array[0], 1); // Preserve hue while fading alpha.
    renderer.linkGeometry.dispose(); renderer.selGeometry.dispose();
  } finally { await server.close(); }
});
