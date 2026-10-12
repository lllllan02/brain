import test from 'node:test';
import assert from 'node:assert/strict';
import { checkBundle } from '../scripts/bundle-budget.ts';
const chunk = (name, bytes, extra = {}) => ({ file: `${name}.js`, name, bytes, entry: false, imports: [], ...extra });

test('体积预算允许独立懒加载的上游单体包，但拒绝新增大包和上游增长', () => {
  const report = checkBundle([chunk('index', 350_000, { entry: true }), chunk('mermaid-parser', 655_000), chunk('mermaid-elk', 1_440_000)]);
  assert.deepEqual(report.violations, []);
  assert.deepEqual(report.chunks.map(c => c.initial), [true, false, false]);
  assert.equal(checkBundle([chunk('scene', 501_000)]).violations.length, 1);
  assert.equal(checkBundle([chunk('mermaid-elk', 1_500_001)]).violations.length, 1);
});

test('沿静态依赖检查首屏，不允许图表或三维引擎经共享模块提前加载', () => {
  const report = checkBundle([
    chunk('index', 100, { entry: true, imports: ['shared.js'] }),
    chunk('shared', 100, { imports: ['three-core.js', 'index.js'] }),
    chunk('three-core', 100),
  ]);
  assert.match(report.violations[0], /optional engine entered/);
});
