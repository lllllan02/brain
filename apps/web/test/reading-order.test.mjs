import test from 'node:test';
import assert from 'node:assert/strict';
import {readingDocuments} from '../src/reading-order.ts';
const doc=(id,time,extra={})=>({id,state:'reading',stateChangedAt:time,...extra});
test('阅读中按状态修改时间倒序，区分毫秒与时区，并忽略正文更新时间',()=>{
 const documents=[doc('older','2026-10-17T09:00:00.001+08:00',{updated:'2099-01-01'}),doc('newer','2026-10-17T01:00:00.002Z'),doc('done','2099-01-01',{state:'organized'}),doc('unknown',null)];
 assert.deepEqual(readingDocuments(documents).map(d=>d.id),['newer','older','unknown']);
 assert.deepEqual(documents.map(d=>d.id),['older','newer','done','unknown']);
});
test('旧文复用最近一次进入阅读中的历史记录，无记录或非法时间稳定排末尾',()=>{
 const documents=[doc('z',null),doc('a','invalid'),doc('history',null),doc('saved','2026-10-17T10:00:00+08:00')];
 const activity={events:[{kind:'state-changed',docId:'history',to:'reading',time:'2026-10-17T11:00:00+08:00'},{kind:'state-changed',docId:'history',to:'reading',time:'2026-10-16T11:00:00+08:00'},{kind:'updated',docId:'z',time:'2099-01-01'},{kind:'state-changed',docId:'saved',to:'reading',time:'2099-01-01'}]};
 assert.deepEqual(readingDocuments(documents,activity).map(d=>d.id),['history','saved','a','z']);
});
