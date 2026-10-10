import test from 'node:test';
import assert from 'node:assert/strict';
import {adjacentDocument, parseReadingRoute, readVisits, readingTrail, recordVisit, recentDocuments, rememberDocument, readingDirection, trailPlayback} from '../src/neural/reading-history.js';

const visit = (id, from, key = id) => ({key, id, from, time: 1});
test('前后篇跳过主页、同篇锚点与已移除文档，并在边界停下', () => {
  const entries = [null, 'a', 'a', 'removed', null, 'b', 'c'].map(id => ({id}));
  const available = new Set(['a', 'b', 'c']);
  assert.equal(adjacentDocument(entries, 5, -1, available), 2);
  assert.equal(adjacentDocument(entries, 2, 1, available), 5);
  assert.equal(adjacentDocument(entries, 1, -1, available), -1);
  assert.equal(adjacentDocument(entries, 6, 1, available), -1);
  assert.equal(adjacentDocument(entries, 4, -1, available), 2);
  assert.equal(adjacentDocument([], 0, -1, available), -1);
});

test('阅读足迹保留返回与分支的真实顺序，不因文档重复而丢失路线', () => {
  let visits = [];
  for (const [i, [id, from]] of [['a', null], ['b', 'a'], ['c', 'b'], ['b', 'c'], ['d', 'b']].entries()) {
    visits = recordVisit(visits, visit(id, from, String(i)));
  }
  assert.equal(recordVisit(visits, visit('d', 'd')), visits);
  const trail = readingTrail(visits, new Set(['a', 'b', 'c', 'd']));
  assert.deepEqual(trail.edges.map(e => [e.from, e.to]), [['a', 'b'], ['b', 'c'], ['c', 'b'], ['b', 'd']]);
  assert.deepEqual(trail.nodes.find(n => n.id === 'b').steps, [2]);
});

test('最近阅读按最后访问时间倒序，回看置顶且列表编号与星图一致', () => {
  const visits = [visit('a', null), visit('b', 'a'), visit('c', 'b'), visit('b', 'c', 'b2')].map((item, time) => ({...item, time}));
  let recent = recentDocuments(visits);
  assert.deepEqual(recent.map(v => v.id), ['b', 'c', 'a']);
  for (let i = 0; i < 70; i++) recent = rememberDocument(recent, {...visit(i % 2 ? 'a' : 'b', 'c', String(i)), time: i + 4});
  assert.deepEqual(recent.map(v => v.id), ['a', 'b', 'c']);
  recent = rememberDocument(recent, {...visit('d', 'a'), time: 74});
  assert.deepEqual(recent.map(v => v.id), ['d', 'a', 'b', 'c']);
  assert.deepEqual(recentDocuments(JSON.parse(JSON.stringify(recent))), recent);
  const trail = readingTrail([...visits, visit('c', 'b')], new Set(['a', 'b', 'c', 'd']), recent);
  assert.deepEqual(trail.nodes.map(n => [n.id, ...n.steps]), [['d', 1], ['a', 2], ['b', 3], ['c', 4]]);
  assert.deepEqual(trail.edges.map(e => [e.from, e.to]), [['a', 'b'], ['b', 'c'], ['c', 'b']]);
  assert.equal(rememberDocument(Array.from({length:50}, (_, i) => visit(String(i), null)), visit('new', null)).length, 50);
  const full = Array.from({length:50}, (_, i) => ({...visit(String(i), null), time:i}));
  const refreshed = rememberDocument(full, {...visit('0', '49'), time:100});
  const trimmed = rememberDocument(refreshed, {...visit('new', '0'), time:101});
  assert.equal(trimmed[0].id, 'new');
  assert.equal(trimmed[1].id, '0');
  assert.ok(!trimmed.some(item => item.id === '1'));
});

test('轨迹不跨新阅读段落或已删除文档伪造连线', () => {
  const visits = [visit('a', null), visit('removed', 'a'), visit('b', 'removed'), visit('c', null), visit('d', 'c')];
  const trail = readingTrail(visits, new Set(['a', 'b', 'c', 'd']));
  assert.deepEqual(trail.edges, [{from: 'c', to: 'd', step: 5}]);
  assert.deepEqual(readingTrail([], new Set()), {nodes: [], edges: [], segments: []});
});

test('历史有上限，损坏或无效的本地记录可以安全忽略', () => {
  assert.deepEqual(readVisits('broken'), []);
  assert.deepEqual(readVisits('{}'), []);
  assert.deepEqual(readVisits('[null,{"id":"a"}]'), []);
  let visits = [];
  for (let i = 0; i < 60; i++) visits = recordVisit(visits, visit(String(i), i ? String(i - 1) : null));
  assert.equal(visits.length, 50);
  assert.equal(visits[0].id, '10');
  assert.deepEqual(readVisits(JSON.stringify(visits)), visits);
  assert.equal(readingTrail(visits, new Set(visits.map(v => v.id))).edges.length, 49);
});

test('解析中文文件名、锚点与错误编码时不打断阅读', () => {
  assert.deepEqual(parseReadingRoute('#/doc/%E7%AC%94%E8%AE%B0/%E7%AB%A0%E8%8A%82'), {id: '笔记', module: null, anchor: '章节'});
  assert.deepEqual(parseReadingRoute('#/doc/%E7'), {id: null, module: null, anchor: ''});
  assert.deepEqual(parseReadingRoute('#/'), {id: null, module: null, anchor: ''});
});

test('方向键仅用于普通阅读，不抢占编辑、控件、组合键和长按', () => {
  const event = {key:'ArrowLeft',target:{closest:()=>null}};
  assert.equal(readingDirection(event), -1);
  assert.equal(readingDirection({...event,key:'ArrowRight'}), 1);
  assert.equal(readingDirection({...event,key:'ArrowDown'}), 0);
  for (const flag of ['defaultPrevented','repeat','isComposing','metaKey','ctrlKey','altKey','shiftKey']) {
    assert.equal(readingDirection({...event,[flag]:true}), 0);
  }
  assert.equal(readingDirection({...event,target:{isContentEditable:true}}), 0);
  assert.equal(readingDirection({...event,target:{closest:()=>({})}}), 0);
});

test('动画保留重复往返的顺序，而静态连线仍去重', () => {
  const visits=[visit('a',null,'1'),visit('b','a','2'),visit('a','b','3'),visit('b','a','4'),visit('c','b','5')];
  const trail=readingTrail(visits,new Set(['a','b','c']));
  assert.deepEqual(trail.segments.map(e=>[e.from,e.to]),[['a','b'],['b','a'],['a','b'],['b','c']]);
  assert.equal(trail.edges.length,3);
  assert.deepEqual(trail.segments.map(e=>e.key),['2','3','4','5']);
});

test('首次展开播放全程，持续展开时仅播放最后新增的一段', () => {
  const segments=[{key:'a'},{key:'b'},{key:'c'}];
  assert.deepEqual(trailPlayback(segments,null),{play:segments,settled:[]});
  assert.deepEqual(trailPlayback(segments,['a','b']),{play:[segments[2]],settled:segments.slice(0,2)});
  // A second navigation interrupts the old playback instead of replaying it.
  assert.deepEqual(trailPlayback(segments,['a']),{play:[segments[2]],settled:segments.slice(0,2)});
  assert.deepEqual(trailPlayback(segments,['a','b','c']),{play:[],settled:segments});
  assert.deepEqual(trailPlayback(segments.slice(1),['a','b','c']),{play:[],settled:segments.slice(1)});
  assert.deepEqual(trailPlayback([],['a']),{play:[],settled:[]});
  assert.deepEqual(trailPlayback(segments,[]),{play:[segments[2]],settled:segments.slice(0,2)});
});
