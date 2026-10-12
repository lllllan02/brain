import test from 'node:test';
import assert from 'node:assert/strict';
import {dashboardPulse} from '../src/neural/dashboard-model.js';
const doc = {id:'a',category:'Agent'};
const event = (kind,time,extra={}) => ({kind,time,docId:'a',entity:'doc:a',collections:['inbox'],...extra});
test('趋势按北京时间、每天同一文档去重；摘要按整个区间去重，排除未来记录',()=>{
  const result=dashboardPulse({startedAt:'2026-10-01',events:[event('updated','2026-10-11T16:01:00Z'),event('updated','2026-10-12T03:00:00Z'),event('updated','2026-10-11'),event('created','2026-10-13')]},[doc],'2026-10-12',7);
  assert.equal(result.series.length,7);
  assert.equal(result.series.at(-1).updated,1);
  assert.equal(result.series.at(-2).updated,1);
  assert.equal(result.counts.updated,1);
  assert.equal(result.counts.created,0);
  assert.equal(result.activeDays,2);
  assert.equal(result.complete,true);
  assert.deepEqual(result.topics,[{name:'Agent',count:1}]);
});
test('双向流转独立计数，图片与缺失文档不进入活跃主题，历史不完整不声明完整',()=>{
 const result=dashboardPulse({startedAt:'2026-10-12',events:[event('moved','2026-10-12',{to:'notes'}),event('moved','2026-10-12',{to:'inbox'}),event('image-created','2026-10-12',{entity:'image:x',docId:null}),event('created','2026-10-12',{docId:'missing',entity:'doc:missing'})]},[doc],'2026-10-12',30);
 assert.equal(result.counts.learned,1);assert.equal(result.counts.relearn,1);assert.equal(result.complete,false);
 assert.deepEqual(result.topics,[{name:'Agent',count:1}]);
});
test('空库保留完整日期序列与空主题',()=>{
 const result=dashboardPulse(null,[],'2026-01-02',7);
 assert.equal(result.start,'2025-12-27');assert.equal(result.activeDays,0);assert.deepEqual(result.topics,[]);
 assert.ok(result.series.every(d=>d.created===0&&d.updated===0));
});

test('周期对比排除今天，两个完整区间覆盖不足时不可比较', async()=>{
 const {dashboardComparison}=await import('../src/neural/dashboard-model.js');
 const activity={startedAt:'2026-09-01T00:00:00+08:00',events:[]};
 const value=dashboardComparison(activity,[],'2026-10-12',7);
 assert.equal(value.current.start,'2026-10-05');
 assert.equal(value.end,'2026-10-11');
 assert.equal(value.previous.start,'2026-09-28');
 assert.equal(value.comparable,true);
 assert.equal(dashboardComparison({...activity,startedAt:'2026-09-28T12:00:00+08:00'},[],'2026-10-12',7).comparable,false);
 assert.equal(dashboardComparison({...activity,startedAt:'2026-10-01T00:00:00+08:00'},[],'2026-10-12',7).comparable,false);
 assert.equal(dashboardComparison({...activity,error:'记录损坏'},[],'2026-10-12',7).comparable,false);
});
