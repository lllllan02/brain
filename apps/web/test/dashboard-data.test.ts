import test from 'node:test';
import assert from 'node:assert/strict';
import type { ReaderDocumentNode, ReaderGraph } from '../src/types/graph.ts';
import type { ActivityEvent } from '../src/types/library.ts';
import {
  dashboardData,
  topicGroups,
  newestFirst,
  monthCells,
  recentActivity,
  shiftMonth,
} from '../src/neural/dashboard-data.ts';
import { dashboardRoute, dashboardHref } from '../src/neural/dashboard-route.ts';
function doc(id: string, extra: Partial<ReaderDocumentNode> = {}): ReaderDocumentNode {
  return {
    id,
    title: id,
    nodeType: 'document',
    module: 'notes',
    modules: ['notes'],
    folder: 'notes',
    kind: 'note',
    type: 'note',
    collection: 'notes',
    path: `notes/${id}.md`,
    category: '甲',
    tags: [],
    aliases: [],
    state: 'pending',
    created: null,
    updated: null,
    sources: [],
    body: '',
    summary: '',
    html: '',
    toc: [],
    references: [],
    issues: [],
    parentTarget: null,
    parent: null,
    ...extra,
  };
}
function graph(docs: ReaderDocumentNode[]): ReaderGraph {
  return {
    nodes: [...docs, { id: 'core', title: 'core', nodeType: 'core', tags: [], kind: 'core' }],
    index: new Map(docs.map((d) => [d.id, d])),
    modules: [],
    links: [],
    kinds: {},
    styles: {},
    public: true,
  };
}
test('统计仅覆盖文档节点，缺省状态计为待学习，日期使用明确字段', () => {
  const data = dashboardData(
    graph([
      doc('a', { state: 'reading' }),
      doc('b', { state: 'organized', updated: '2026-10-02' }),
      doc('c', { state: null, created: '2026-10-01' }),
    ]),
  );
  assert.deepEqual(data.counts, { reading: 1, pending: 1, organized: 1 });
  assert.equal(data.docs.length, 3);
  assert.equal(data.latest?.id, 'b');
  assert.deepEqual(
    [...data.docs].sort(newestFirst).map((d) => d.id),
    ['b', 'c', 'a'],
  );
});
test('专题分布保留状态构成、未分类与原文档所属星图分组', () => {
  const groups = topicGroups([
    doc('a', { state: 'reading', module: 'topic:A' }),
    doc('b', { state: 'organized', module: 'topic:A' }),
    doc('c', { category: '' }),
  ]);
  assert.equal(groups[0].name, '甲');
  assert.deepEqual(groups[0].counts, { reading: 1, pending: 0, organized: 1 });
  assert.equal(groups[0].docs[0].module, 'topic:A');
  assert.equal(groups[1].name, '未分类');
});
test('看板地址区分概况和记录，不把正文或无效页面识别成看板', () => {
  assert.equal(dashboardRoute(dashboardHref('overview')), 'overview');
  assert.equal(dashboardRoute(dashboardHref('activity')), 'activity');
  assert.equal(dashboardRoute('#/dashboard/'), 'overview');
  for (const url of [
    '#/',
    '#/doc/first',
    '#/module/topic:A',
    '#/dashboard/map',
    '#/dashboard/activity/extra',
  ])
    assert.equal(dashboardRoute(url), null);
});
test('日变化按北京时间、对象去重，区间排除未来和无效日期', () => {
  const event = (
    time: string,
    entity = 'doc:a',
    docId: string | undefined = 'a',
  ): ActivityEvent => ({
    id: time + entity,
    kind: 'updated',
    time,
    entity,
    docId,
    title: 'A',
    collections: ['notes'],
    source: 'observed',
  });
  const result = recentActivity(
    [
      event('2026-10-11T16:01:00Z'),
      event('2026-10-12T04:00:00+08:00'),
      event('2026-10-11'),
      event('2026-10-13'),
      event('bad'),
      { ...event('2026-10-12', 'image:a'), docId: undefined },
    ],
    '2026-10-12',
  );
  assert.equal(result.series.length, 14);
  assert.equal(result.start, '2026-09-29');
  assert.equal(result.series.at(-1)?.count, 2);
  assert.equal(result.series.at(-2)?.count, 1);
  assert.equal(result.documents, 1);
});
test('月历按周一对齐，覆盖闰年与年界；空库能正确显示', () => {
  const leap = monthCells('2024-02');
  assert.equal(leap[0], '2024-01-29');
  assert.ok(leap.includes('2024-02-29'));
  assert.equal(leap.length % 7, 0);
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(dashboardData(graph([])).docs.length, 0);
  assert.ok(recentActivity([], '2026-10-12').series.every((d) => d.count === 0));
});
