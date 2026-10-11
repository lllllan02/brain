import test from 'node:test';
import assert from 'node:assert/strict';
import {libraryStats} from '../src/neural/library-stats.js';

test('统计按文档去重标签与引用，缺失分类不虚增分类总数', () => {
  const stats = libraryStats([
    {id:'a', collection:'inbox', category:'Agent', tags:['工具','工具'], references:[{id:'b'},{id:'b'},{id:'a'},{id:'missing'}]},
    {id:'b', collection:'notes', category:'Agent', tags:['工具'], references:[{id:'a'}]},
    {id:'c', collection:'readings', category:' ', tags:[], references:[]},
  ]);
  assert.equal(stats.total, 3);
  assert.equal(stats.categoryCount, 1);
  assert.equal(stats.references, 2);
  assert.deepEqual(stats.tags, [['工具', 2]]);
  assert.equal(stats.categories[0].total, 2);
  assert.equal(stats.collections.get('inbox'), 1);
  assert.equal(stats.categories[1].name, '');
});

test('空库的统计保持零值', () => {
  const stats = libraryStats([]);
  assert.equal(stats.total, 0);
  assert.equal(stats.references, 0);
  assert.equal(stats.tagCount, 0);
  assert.deepEqual(stats.categories, []);
});
