import test from 'node:test';
import assert from 'node:assert/strict';
import { effectivePixelRatio } from '../src/galaxy/vendor/quality/tiers.ts';
import { createSceneOverlay } from '../src/neural/scene-overlay.ts';

test('Retina 与 4K 后处理缓冲不超过三百万像素，小屏保留档位清晰度', () => {
  for (const [width, height, dpr] of [
    [1440, 960, 2],
    [3840, 2160, 2],
    [7680, 4320, 1],
  ]) {
    const ratio = effectivePixelRatio(dpr, 2, width, height);
    assert.ok(width * height * ratio ** 2 <= 3_000_001);
    assert.ok(ratio <= dpr);
  }
  assert.equal(effectivePixelRatio(2, 1.5, 390, 844), 1.5);
});

test('静止投影不通知 React，动画只通知覆盖层，退出释放订阅与投影', () => {
  const overlay = createSceneOverlay();
  let updates = 0;
  const unsubscribe = overlay.subscribe(() => updates++);
  const initial = overlay.getSnapshot();
  overlay.setLabels([]);
  overlay.setTrail({ nodes: [], edges: [] });
  assert.equal(overlay.getSnapshot(), initial);
  assert.equal(updates, 0);
  const label = { id: 'a', title: 'A', x: 10, y: 20 };
  overlay.setLabels([label]);
  const first = overlay.getSnapshot();
  overlay.setLabels([{ ...label }]);
  assert.equal(overlay.getSnapshot(), first);
  overlay.setLabels([{ ...label, x: 12 }]);
  assert.equal(updates, 2);
  overlay.clear();
  assert.equal(overlay.getSnapshot().labels.length, 0);
  unsubscribe();
  overlay.setLabels([label]);
  assert.equal(updates, 3);
});
