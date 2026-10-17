import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLibrary } from '../src/data/library-schema.ts';
import { parseDocument, renderDocument } from '../src/library.ts';
import { createLibraryStore } from '../src/data/library-store.ts';
import { validFocus, validReadingSession, validPinnedList } from '../src/neural/view-state.ts';
const raw = parseDocument('---\ntitle: Example\n---\nHello', 'notes/example.md');
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

test('轮询单飞、状态写回取消旧读取；迟到旧响应不能覆盖状态写回结果', async () => {
  const reads = [], write = deferred(); let signal;
  const store = createLibraryStore({fetch: s => {signal=s; const task=deferred();reads.push(task);return task.promise;},setState:()=>write.promise});
  store.start(); await store.refresh(); assert.equal(reads.length,1);
  reads[0].resolve(library); await tick();
  void store.refresh(); assert.equal(reads.length,2);
  const moving=store.setState('example','organized'); assert.equal(signal.aborted,true);
  await store.refresh(); assert.equal(reads.length,2);
  const moved={...library,version:'v2'}; write.resolve(moved); await moving;
  reads[1].resolve(library); await tick();
  assert.equal(store.getSnapshot().library,moved);
  assert.equal(store.getSnapshot().updateState.status,'success');
  store.stop();
});

test('失败后恢复清除错误；卸载取消读取并隔离旧生命周期响应', async () => {
  const reads=[];const store=createLibraryStore({fetch:s=>{const task=deferred();reads.push({...task,signal:s});return task.promise;},setState:async()=>library});
  store.start(); reads[0].reject(Error('offline')); await tick();
  assert.equal(store.getSnapshot().status,'error');
  void store.refresh(); reads[1].resolve(library); await tick();
  assert.equal(store.getSnapshot().error,'');
  void store.refresh(); store.stop(); assert.equal(reads[2].signal.aborted,true);
  store.start(); reads[3].resolve({...library,version:'v3'}); await tick();
  reads[2].resolve({...library,version:'v2'}); await tick();
  assert.equal(store.getSnapshot().library.version,'v3'); store.stop();
});

test('未加载不允许状态写回，失败写入保留正文', async () => {
  const write=deferred();let writes=0;
  const store=createLibraryStore({fetch:async()=>library,setState:()=>{writes++;return write.promise;}});
  await store.setState('example','organized');assert.equal(writes,0);
  store.start();await tick();const moving=store.setState('example','organized');
  await store.setState('example','organized');assert.equal(writes,1);
  write.reject(Error('version conflict'));await moving;
  assert.equal(store.getSnapshot().library,library);
  assert.equal(store.getSnapshot().updateState.status,'error');
  store.clearUpdate();assert.equal(store.getSnapshot().updateState.status,'idle');store.stop();
});


test('卸载前的写入迟到结果不能覆盖重新连接后的文档库', async () => {
  const write=deferred();let version='v1';
  const store=createLibraryStore({fetch:async()=>({...library,version}),setState:()=>write.promise});
  store.start();await tick();const moving=store.setState('example','organized');
  store.stop();version='v3';store.start();await tick();
  write.resolve({...library,version:'v2'});await moving;
  assert.equal(store.getSnapshot().library.version,'v3');
  assert.equal(store.getSnapshot().updateState.status,'idle');store.stop();
});

test('后台自动同步最新库，只替换变化的文档对象；无变化不通知', async () => {
  let next=library;
  const store=createLibraryStore({fetch:async()=>next,setState:async()=>next});
  let notifications=0;store.subscribe(()=>notifications++);
  store.start();await tick();const initial=store.getSnapshot();
  await store.refresh();assert.equal(store.getSnapshot(),initial);assert.equal(notifications,1);
  const other={...library.documents[0],id:'other'};
  next={...library,version:'v2',documents:[...library.documents,other]};await store.refresh();
  assert.equal(store.getSnapshot().library.documents[0],library.documents[0]);
  assert.equal(store.getSnapshot().library.documents[1],other);
  const changed={...other,body:'changed'};
  next={...next,version:'v3',documents:[{...library.documents[0]},changed]};await store.refresh();
  assert.equal(store.getSnapshot().library.documents[0],library.documents[0]);
  assert.equal(store.getSnapshot().library.documents[1],changed);
  next={...next,version:'v4',documents:[changed]};await store.refresh();
  assert.equal(store.getSnapshot().library.documents.length,1);store.stop();
});

test('后台读取失败保留已加载正文，恢复后自动同步', async () => {
  let next=library, failure=false;
  const store=createLibraryStore({fetch:async()=>{if(failure)throw Error('offline');return next;},setState:async()=>next});
  store.start();await tick();failure=true;await store.refresh();
  assert.equal(store.getSnapshot().library,library);assert.equal(store.getSnapshot().error,'offline');
  next={...library,version:'v2'};failure=false;await store.refresh();
  assert.equal(store.getSnapshot().library.version,'v2');assert.equal(store.getSnapshot().error,'');store.stop();
});

test('点击立即显示新状态，服务端未完成时保持保存中；失败恢复原状态与正文', async()=>{
  const write=deferred();
  const other={...library.documents[0],id:'unrelated'};
  const initial={...library,documents:[library.documents[0],other]};
  const store=createLibraryStore({fetch:async()=>initial,setState:()=>write.promise});
  store.start();await tick();
  const pending=store.setState('example','reading');
  const optimistic=store.getSnapshot();
  assert.equal(optimistic.library.documents[0].state,'reading');
  assert.equal(optimistic.library.documents[0].body,initial.documents[0].body);
  assert.equal(optimistic.library.documents[1],other);
  assert.equal(optimistic.updateState.status,'pending');
  write.reject(Error('文件冲突'));await pending;
  assert.equal(store.getSnapshot().library,initial);
  assert.equal(store.getSnapshot().updateState.status,'error');
  store.stop();
});
