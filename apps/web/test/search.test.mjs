import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDocument} from '../src/library.mjs';
import {createSearchIndex, searchDocuments} from '../src/neural/search.js';

const note = (id, title, extra = {}) => ({id, title, ...extra});
const results = (documents, query) => searchDocuments(createSearchIndex(documents), query).map(doc => doc.id);

test('完整标题始终优先于别名、标题包含、标签、分类和正文，不受目录顺序影响', () => {
  const documents = [
    note('eventual', '最终一致性', {body: '顺序一致性。'.repeat(1000)}),
    note('category', '分类示例', {category: '顺序一致性'}),
    note('tag', '标签示例', {tags: ['顺序一致性']}),
    note('alias-part', '另一术语', {aliases: ['顺序一致性的说明']}),
    note('title-part', '顺序一致性的实现'),
    note('alias', 'Sequential Consistency', {aliases: ['顺序一致性']}),
    note('sequential', '顺序一致性'),
  ];
  const expected = ['sequential', 'alias', 'title-part', 'alias-part', 'tag', 'category', 'eventual'];
  assert.deepEqual(results(documents, '顺序一致性'), expected);
  assert.deepEqual(results([...documents].reverse(), '顺序一致性'), expected);
});

test('标题包含时优先前缀与更聚焦的短标题，同分结果稳定且不修改原数组', () => {
  const documents = Object.freeze([
    note('middle', '如何实现顺序一致性'),
    note('long', '顺序一致性的原理与实现'),
    note('short-b', '顺序一致性模型'),
    note('short-a', '顺序一致性模型'),
  ]);
  const expected = ['short-a', 'short-b', 'long', 'middle'];
  assert.deepEqual(results(documents, '顺序一致性'), expected);
  assert.deepEqual(results([...documents].reverse(), '顺序一致性'), expected);
  assert.equal(documents[0].id, 'middle');
});

test('多关键词要求全部命中，支持跨字段和不同词序，连续短语优先', () => {
  const documents = [
    note('missing', 'ZooKeeper'),
    note('cross-field', 'ZooKeeper', {tags: ['一致性']}),
    note('body', '分布式系统', {body: 'ZooKeeper 提供了一致性保证'}),
    note('title', '一致性：ZooKeeper 的保证'),
    note('phrase', 'ZooKeeper 一致性详解'),
  ];
  assert.deepEqual(results(documents, 'ZooKeeper 一致性'), ['phrase', 'title', 'cross-field', 'body']);
  assert.deepEqual(results(documents, '一致性 ZooKeeper ZooKeeper'), ['phrase', 'title', 'cross-field', 'body']);
});

test('中英文标题按中文主标题排序，同时保留英文和完整标题的检索', () => {
  const documents = [
    note('storage', '长期记忆如何存储'),
    note('types', '长期记忆的内容分类'),
    note('overview', '长期记忆（Long-term Memory）'),
    note('alias', '其他名称', {aliases: ['长期记忆']}),
  ];
  for (const query of ['长期', '长期记忆', '记忆 长期']) {
    assert.equal(results(documents, query)[0], 'overview');
    assert.equal(results([...documents].reverse(), query)[0], 'overview');
  }
  for (const query of ['Long-term Memory', '长期记忆（Long-term Memory）', '长期 Memory']) {
    assert.deepEqual(results(documents, query), ['overview']);
  }
  assert.deepEqual(results(documents, '长期记忆如何存储'), ['storage']);
});

test('只简化中文标题的末尾英文注释，不去掉中文限定或英文标题中的括号', () => {
  const documents = [
    note('qualified', '长期记忆（进阶）'),
    note('english', 'Memory (Advanced)'),
    note('plain', '长期记忆'),
    note('translated', '长期记忆 (Long-term Memory)'),
    note('suffix', '长期记忆（Long-term Memory）的存储'),
  ];
  assert.deepEqual(results(documents, '长期'), ['plain', 'translated', 'qualified', 'suffix']);
  assert.deepEqual(results(documents, '进阶'), ['qualified']);
  assert.deepEqual(results(documents, 'Advanced'), ['english']);
});

test('忽略大小写、全半角和多余空白，保留 C++ 等技术词的标点', () => {
  const documents = [note('cpp', 'C++'), note('c', 'C'), note('sc', 'Sequential Consistency')];
  assert.deepEqual(results(documents, '  ＳＥＱＵＥＮＴＩＡＬ\t consistency  '), ['sc']);
  assert.deepEqual(results(documents, 'Ｃ＋＋'), ['cpp']);
  for (const query of ['', ' \n\t ', '不存在']) assert.deepEqual(results(documents, query), []);
  assert.deepEqual(results([], '一致性'), []);
});

test('正文短语优先于零散命中，字段边界不会拼出虚假的短语', () => {
  const documents = [note('split', '其他', {body: 'read 然后执行 write'}),
    note('phrase', '正文示例', {body: 'read write 是连续短语'}),
    note('boundary', 'read', {category: 'write'})];
  assert.deepEqual(results(documents, 'read write'), ['phrase', 'boundary', 'split']);
});

test('真实解析器生成的 Notes 和 Inbox 文档都参与排序，更新索引后反映新内容', () => {
  const eventual = parseDocument('---\ntitle: 最终一致性\n---\n与顺序一致性不同。', 'notes/eventual.md');
  const sequential = parseDocument('---\ntitle: 顺序一致性\naliases: [Sequential Consistency]\n---\n说明', 'inbox/sequential.md');
  const index = createSearchIndex([eventual, sequential]);
  assert.equal(searchDocuments(index, '顺序一致性')[0], sequential);
  assert.equal(searchDocuments(index, 'sequential consistency')[0], sequential);
  const updated = {...sequential, title: '新标题', aliases: []};
  assert.deepEqual(results([eventual, updated], '顺序一致性'), ['eventual']);
});
