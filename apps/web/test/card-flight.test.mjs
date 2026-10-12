import test from 'node:test';
import assert from 'node:assert/strict';
import {cardFlight} from '../src/motion/card-flight.ts';

test('标题从卡片原位出发，收拢成星芒并准确落到实时星点', () => {
  const origin = {x:800,y:230}, target = {x:300,y:400};
  const start = cardFlight(origin,target,0);
  assert.equal(start.x,origin.x); assert.equal(start.y,origin.y);
  assert.equal(start.scale,1); assert.equal(start.textOpacity,1); assert.equal(start.starOpacity,0);
  const middle = cardFlight(origin,target,325);
  assert.ok(middle.x < origin.x && middle.x > target.x);
  assert.ok(middle.textOpacity < 1 && middle.starOpacity > 0);
  const moved = {x:280,y:420};
  const landed = cardFlight(origin,moved,650);
  assert.ok(Math.abs(landed.x-moved.x) < 1e-10 && Math.abs(landed.y-moved.y) < 1e-10);
  assert.equal(landed.textOpacity,0); assert.ok(landed.ringOpacity > 0);
  const finished = cardFlight(origin,moved,800);
  assert.equal(finished.starOpacity,0); assert.equal(finished.ringOpacity,0);
});

test('重合点和短距离飞行不会产生无效坐标或越界透明度', () => {
  for (const target of [{x:10,y:10},{x:11,y:10}]) for (const time of [-5,0,150,500,650,800,1000]) {
    const state = cardFlight({x:10,y:10},target,time);
    assert.ok(Object.values(state).every(Number.isFinite));
    for (const key of ['textOpacity','starOpacity','ringOpacity']) assert.ok(state[key]>=0 && state[key]<=1);
  }
});
