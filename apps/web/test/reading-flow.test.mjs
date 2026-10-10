import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {BufferGeometry} from 'three';
import {READING_FLOW, readingFlow, beamEnvelope, launchEnvelope, launchAccent, launchWake} from '../src/motion/reading-flow.js';

test('阅读光束先汇入再扇出，每批最多三条并覆盖所有可见目标', () => {
  const seen = new Set();
  for (let cycle = 0; cycle < 7; cycle++) {
    const start = cycle * READING_FLOW.period;
    const active = Array.from({length: 7}, (_, i) => i).filter(i => readingFlow(start + .5, i, 7).active);
    assert.equal(active.length, 3);
    active.forEach(i => seen.add(i));
    assert.ok(readingFlow(start + .5, active[0], 7).opacity > 0);
    assert.equal(readingFlow(start + .5, active[0], 7, true).opacity, 0);
    assert.equal(readingFlow(start + 1.45, active[0], 7).opacity, 0);
    assert.ok(readingFlow(start + 1.45, active[0], 7, true).opacity > 0);
  }
  assert.equal(seen.size, 7);
  assert.equal(readingFlow(0, 0, 0).active, false);
  for (const phase of [-1, 0, 1, 2]) assert.equal(beamEnvelope(phase).opacity, 0);
});

test('引用方向不改变汇入方向，旧选中和非当前节点连线不播放光束', async () => {
  const server = await createServer({configFile:false, optimizeDeps:{noDiscovery:true}, server:{middlewareMode:true,hmr:false,ws:false}});
  try {
    const {selectionFlowAttributes} = await server.ssrLoadModule('/src/galaxy/vendor/render/selectionFlow.ts');
    const geometry = new BufferGeometry();
    const count = selectionFlowAttributes(geometry, [{source:0,target:1}, {source:2,target:0}, {source:1,target:2}, {source:0,target:3}], 2, 0, new Set([0,1,2]), [0,1,2,3]);
    assert.equal(count, 2);
    assert.deepEqual([...geometry.getAttribute('aFlowAlong').array.slice(0, 8)], [1,.5,.5,0,0,.5,.5,1]);
    assert.deepEqual([...geometry.getAttribute('aFlowSeed').array], [0,0,0,0,1,1,1,1,-1,-1,-1,-1,-1,-1,-1,-1]);
    geometry.dispose();
  } finally {await server.close();}
});


test('发射短于汇入，亮芯保持到末段，聚光与余波不会持续闪烁', () => {
  assert.ok(READING_FLOW.launch < READING_FLOW.travel / 3);
  assert.ok(launchEnvelope(.9).opacity > .8);
  assert.ok(launchEnvelope(.85).tail - launchEnvelope(.85).offset > .9);
  assert.equal(launchEnvelope(1).opacity, 0);
  assert.equal(launchEnvelope(-.1).opacity, 0);
  assert.ok(launchAccent(READING_FLOW.handoff - .05).charge > .5);
  assert.equal(launchAccent(READING_FLOW.handoff).charge, 0);
  assert.equal(launchAccent(READING_FLOW.handoff).flash, 1);
  assert.equal(launchAccent(READING_FLOW.handoff + .3).flash, 0);
});

test('快光头消失后留下已走过路径的余光，并在下一轮前完全消退', () => {
  const arrival = READING_FLOW.handoff + READING_FLOW.launch;
  assert.equal(launchWake(READING_FLOW.handoff - .01).opacity, 0);
  const moving = launchWake(READING_FLOW.handoff + READING_FLOW.launch / 2);
  assert.ok(moving.length > 0 && moving.length < 1);
  assert.equal(readingFlow(arrival + .2, 0, 3, true).opacity, 0);
  assert.equal(launchWake(arrival + .2).length, 1);
  assert.ok(launchWake(arrival + .2).opacity > .2);
  assert.ok(launchWake(arrival + .6).opacity < launchWake(arrival + .2).opacity);
  assert.equal(launchWake(arrival + READING_FLOW.afterglow + .01).opacity, 0);
});
