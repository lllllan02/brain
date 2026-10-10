import test from 'node:test';
import assert from 'node:assert/strict';
import {latestDocuments, documentHighlight} from '../src/neural/latest-documents.js';
import {documentTime} from '../src/document-dates.js';
import {mkdtemp, mkdir, writeFile, utimes, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {loadLibrary} from '../src/library.mjs';
import {pagesLibrary} from '../scripts/build-pages.mjs';

test('同日精确到秒，时区按实际时间比较，缺失字段回退 mtime', () => {
  const latest = latestDocuments([
    {id: 'a', updated: '2026-10-10T10:00:01+08:00', modified: '2026-10-12T00:00:00Z'},
    {id: 'b', updated: '2026-10-10T02:00:02Z'},
    {id: 'c', modified: '2026-10-10T02:00:03Z'},
    {id: 'd', updated: 'bad', created: '2026-10-10T10:00:04+08:00'},
    {id: 'e', updated: '2026-02-30', modified: '2026-10-10T02:00:05Z'},
  ]);
  assert.deepEqual(latest.map(doc => doc.id), ['e', 'd', 'c', 'b', 'a']);
  assert.ok(Number.isNaN(documentTime('2026-10-10T10:00:00')));
  assert.ok(Number.isNaN(documentTime('2026-02-30')));
  assert.equal(documentTime('2026-10-10T10:00:01+08:00'), documentTime('2026-10-10T02:00:01Z'));
  assert.deepEqual(latestDocuments([
    {id: 'a', updated: '2026-10-10', modified: '2026-10-10T02:00:01Z'},
    {id: 'b', updated: '2026-10-10', modified: '2026-10-10T02:00:02Z'},
  ]).map(doc => doc.id), ['b', 'a']);
});

test('读取和静态导出携带秒级 mtime，未伪造元数据，mtime 改变触发版本更新', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'brain-dates-'));
  try {
    await mkdir(path.join(root, 'inbox'));
    const file = path.join(root, 'inbox', 'example.md');
    await writeFile(file, '---\ntitle: Example\n---\n内容');
    const first = new Date('2026-10-10T02:00:01.500Z');
    await utimes(file, first, first);
    const library = await loadLibrary(root);
    assert.equal(library.documents[0].modified, '2026-10-10T02:00:01.000Z');
    assert.equal(library.documents[0].updated, null);
    assert.equal(library.documents[0].created, null);
    assert.equal(latestDocuments(library.documents).length, 1);
    assert.equal((await pagesLibrary(root)).library.documents[0].modified, library.documents[0].modified);
    const second = new Date('2026-10-10T02:00:02Z');
    await utimes(file, second, second);
    assert.notEqual((await loadLibrary(root)).version, library.version);
  } finally { await rm(root, {recursive: true, force: true}); }
});

test('最新文档按有效更新日期排序，回退创建日期，跳过未知日期且不修改原数据', () => {
  const docs = [{id: 'old', updated: '2025-01-01'},
    {id: 'b', updated: 'invalid', created: '2026-01-01'},
    {id: 'a', updated: '2026-01-01'}, {id: 'unknown'},
    {id: 'new', updated: '2026-02-01', created: '2024-01-01'}];
  const snapshot = structuredClone(docs);
  const latest = latestDocuments(docs);
  assert.deepEqual(latest.map(doc => doc.id), ['new', 'a', 'b', 'old']);
  assert.deepEqual(docs, snapshot);
  const highlight = documentHighlight(latest);
  assert.deepEqual(highlight.nodes.map(node => node.id), ['new', 'a', 'b', 'old']);
  assert.ok(highlight.nodes.every(node => !node.steps.length));
  assert.deepEqual(highlight.edges, []);
  assert.deepEqual(highlight.segments, []);
});

test('最新文档保留最近 10 篇，空列表没有轨迹', () => {
  const docs = Array.from({length: 60}, (_, i) => ({id: String(i), updated: new Date(2026, 0, i + 1).toISOString()}));
  const latest = latestDocuments(docs);
  assert.equal(latest.length, 10);
  assert.equal(latest[0].id, '59');
  assert.equal(latest.at(-1).id, '50');
  assert.deepEqual(documentHighlight([]), {nodes: [], edges: [], segments: []});
});
