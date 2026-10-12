import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLibrary } from '../src/data/library-schema.ts';
import { parseDocument, renderDocument } from '../src/library.ts';
import { createLibraryStore } from '../src/data/library-store.ts';
import { validFocus, validReadingSession, validPinnedList } from '../src/neural/view-state.ts';
const raw = parseDocument('---\ntitle: Example\n---\nHello', 'inbox/example.md');
const library = { version: 'v1', documents: [renderDocument(raw, [raw])] };
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return {promise,resolve,reject}; };
const tick = () => new Promise(resolve => setImmediate(resolve));

test('真实解析输出通过入口校验；嵌套字段、重复文档和未知活动拒绝进入应用', () => {
  assert.equal(parseLibrary(library), library);
  for (const mutate of [
    v => delete v.version, v => v.documents.push(v.documents[0]),
    v => v.documents[0].toc.push({id:'x', title:'x',level:'2'}),
    v => v.documents[0].references.push({id:'x'}),
    v => v.documents[0].tags = [1], v => v.documents[0].parent = {},
    v => v.activity = {version:'a',startedAt:null,events:[{kind:'bad'}]},
  ]) {
    const invalid = structuredClone(library); mutate(invalid);
    assert.throws(() => parseLibrary(invalid), /文档数据格式无效/);
  }

});

test('存储入口拒绝伪对象、不完整阅读记录和混入无效字段的固定列表', () => {
  assert.equal(validFocus({sel:null,mod:null}), true);
  for (const value of [[], 1, {sel:null}, {sel:1,mod:null}]) assert.equal(validFocus(value), false);
  assert.equal(validReadingSession({entries:[{key:'k',url:'#/',id:null,scroll:null}]}), true);
  for (const value of [{entries:[null]}, {entries:[{key:'k',url:'#/',id:null,scroll:Infinity}]}]) assert.equal(validReadingSession(value), false);
  assert.equal(validPinnedList({category:'valid',pinnedIds:['a'],latest:[null]}), false);
});

test('轮询单飞、移动取消旧读取；迟到旧响应不能覆盖移动结果', async () => {
  const reads = [], write = deferred(); let signal;
  const store = createLibraryStore({fetch: s => {signal=s; const task=deferred();reads.push(task);return task.promise;},move:()=>write.promise});
  store.start(); await store.refresh(); assert.equal(reads.length,1);
  reads[0].resolve(library); await tick();
  void store.refresh(); assert.equal(reads.length,2);
  const moving=store.move('example','notes'); assert.equal(signal.aborted,true);
  await store.refresh(); assert.equal(reads.length,2);
  const moved={...library,version:'v2'}; write.resolve(moved); await moving;
  reads[1].resolve(library); await tick();
  assert.equal(store.getSnapshot().library,moved);
  assert.equal(store.getSnapshot().moveState.status,'success');
  store.stop();
});

test('失败后恢复清除错误；卸载取消读取并隔离旧生命周期响应', async () => {
  const reads=[];const store=createLibraryStore({fetch:s=>{const task=deferred();reads.push({...task,signal:s});return task.promise;},move:async()=>library});
  store.start(); reads[0].reject(Error('offline')); await tick();
  assert.equal(store.getSnapshot().status,'error');
  void store.refresh(); reads[1].resolve(library); await tick();
  assert.equal(store.getSnapshot().error,'');
  void store.refresh(); store.stop(); assert.equal(reads[2].signal.aborted,true);
  store.start(); reads[3].resolve({...library,version:'v3'}); await tick();
  reads[2].resolve({...library,version:'v2'}); await tick();
  assert.equal(store.getSnapshot().library.version,'v3'); store.stop();
});

test('未加载不允许移动，失败写入保留正文', async () => {
  const write=deferred();let writes=0;
  const store=createLibraryStore({fetch:async()=>library,move:()=>{writes++;return write.promise;}});
  await store.move('example','notes');assert.equal(writes,0);
  store.start();await tick();const moving=store.move('example','notes');
  await store.move('example','notes');assert.equal(writes,1);
  write.reject(Error('version conflict'));await moving;
  assert.equal(store.getSnapshot().library,library);
  assert.equal(store.getSnapshot().moveState.status,'error');
  store.clearMove();assert.equal(store.getSnapshot().moveState.status,'idle');store.stop();
});


test('卸载前的写入迟到结果不能覆盖重新连接后的文档库', async () => {
  const write=deferred();let version='v1';
  const store=createLibraryStore({fetch:async()=>({...library,version}),move:()=>write.promise});
  store.start();await tick();const moving=store.move('example','notes');
  store.stop();version='v3';store.start();await tick();
  write.resolve({...library,version:'v2'});await moving;
  assert.equal(store.getSnapshot().library.version,'v3');
  assert.equal(store.getSnapshot().moveState.status,'idle');store.stop();
});
