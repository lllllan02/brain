import test from 'node:test';
import assert from 'node:assert/strict';
import {readViewState, writeViewState, validSize, validCluster} from '../src/neural/view-state.js';

const read = (raw, fallback, valid) => readViewState('test', fallback, valid, {getItem: () => raw}, '/brain/');
test('状态损坏、类型不符和存储拒绝访问时回退，不影响阅读', () => {
  for (const raw of ['{', 'null', '"true"', '12']) assert.equal(read(raw, false, v => typeof v === 'boolean'), false);
  assert.equal(read('true', false, v => typeof v === 'boolean'), true);
  assert.equal(readViewState('test', false, v => typeof v === 'boolean', {getItem() {throw Error('blocked');}}), false);
  assert.doesNotThrow(() => writeViewState('test', true));
});
test('保留显式收起状态、具体列表和有效尺寸，拒绝非法尺寸与引用方向', () => {
  for (const value of [{owner:'mcp', value:null}, {owner:'mcp', value:{tag:'MCP'}}, {owner:'mcp',value:{document:'mcp',direction:'incoming'}}]) {
    assert.deepEqual(read(JSON.stringify(value), null, validCluster), value);
  }
  assert.equal(validCluster({owner:'mcp',value:{document:'mcp',direction:'invalid'}}), false);
  assert.deepEqual(read('{"width":640,"height":720}', null, validSize), {width:640,height:720});
  for (const value of [{width:-10,height:500},{width:640,height:'720'},{width:Infinity,height:500}]) assert.equal(read(JSON.stringify(value), null, validSize), null);
});
test('不同站点路径的界面记忆隔离', () => {
  const keys = [];
  const storage = {getItem(key) {keys.push(key);return 'true';}};
  readViewState('expanded', false, v => typeof v === 'boolean', storage, '/');
  readViewState('expanded', false, v => typeof v === 'boolean', storage, '/brain/');
  assert.notEqual(keys[0], keys[1]);
});
