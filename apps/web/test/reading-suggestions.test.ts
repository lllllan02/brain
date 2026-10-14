import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDocument, renderDocument } from '../src/library.ts';
import { buildGraph } from '../src/neural/graph.ts';
import { clusterDocuments } from '../src/neural/ClusterList.tsx';
import { parseLibrary } from '../src/data/library-schema.ts';

test('阅读建议只选正文内链，按配置排序去重且不制造引用', () => {
  const source = parseDocument(
    `---
parent: parent
reading_suggestions: [second, '[[第一篇]]', second, missing, parent, unrelated, source]
---
[[first]] [[second]]`,
    'notes/source.md',
  );
  const targets = ['first', 'second', 'parent', 'unrelated'].map((id) =>
    parseDocument(id === 'first' ? '---\ntitle: 第一篇\n---\n正文' : '正文', `notes/${id}.md`),
  );
  const parsed = [source, ...targets];
  const documents = parsed.map((doc) => renderDocument(doc, parsed));
  assert.deepEqual(documents[0].readingSuggestions, ['second', 'first']);
  assert.equal(documents[0].references.length, 3);
  assert.equal(documents[0].issues.length, 4);
  const library = parseLibrary({ version: 'test', documents });
  const graph = buildGraph(library);
  assert.deepEqual(
    clusterDocuments(graph, { document: 'source', direction: 'suggested' }).map((doc) => doc.id),
    ['second', 'first'],
  );
  assert.equal(documents[0].html.includes('reading_suggestions'), false);
});

test('阅读建议拒绝错误类型，未配置时为空列表', () => {
  for (const value of ['first', '[null]', '[3]', '[""]', '{}'])
    assert.throws(
      () => parseDocument(`---\nreading_suggestions: ${value}\n---\n正文`, 'notes/source.md'),
      /reading_suggestions/,
    );
  const doc = parseDocument('正文', 'notes/source.md');
  assert.deepEqual(renderDocument(doc, [doc]).readingSuggestions, []);
});
