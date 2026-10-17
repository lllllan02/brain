import test from 'node:test';
import assert from 'node:assert/strict';
import {migrateReadingQueue} from '../src/data/migrate-reading-queue.ts';
const key='horizon:reading-queue:v1:/';
function storage(ids) {
  const values=new Map([[key,JSON.stringify(ids)]]);
  return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
}
const library=()=>({version:'v0',documents:[{id:'a',state:'pending'},{id:'b',state:'organized'},{id:'c',state:'reading'}]});
test('旧队列逐篇写回阅读中并使用最新版本，成功后移除旧记录',async()=>{
  const saved=storage(['a','a','b','c','missing']),calls=[];
  let current=library();
  const migrated=await migrateReadingQueue(current,async(id,state,version)=>{
    assert.equal(version,current.version);
    calls.push([id,state]);
    current={...current,version:`v${calls.length}`,documents:current.documents.map(d=>d.id===id?{...d,state}:d)};
    return current;
  },saved,'/');
  assert.deepEqual(calls,[['a','reading'],['b','reading']]);
  assert.ok(migrated.documents.every(d=>d.state==='reading'));
  assert.deepEqual(JSON.parse(saved.getItem(key)),['missing']);
  saved.setItem(key,JSON.stringify(['c']));
  assert.equal(await migrateReadingQueue(migrated,()=>assert.fail('无需重复写入'),saved,'/'),migrated);
  assert.equal(saved.getItem(key),null);
});
test('迁移失败保留未确认记录，兼容存储异常、取消与其他标签页追加',async()=>{
  const saved=storage(['a','b']),initial=library();
  assert.equal(await migrateReadingQueue(initial,async()=>{throw Error('版本冲突');},saved,'/'),initial);
  assert.deepEqual(JSON.parse(saved.getItem(key)),['a','b']);
  const signal=AbortSignal.abort();
  await migrateReadingQueue(initial,()=>assert.fail('已取消'),saved,'/',signal);
  assert.equal(await migrateReadingQueue(initial,()=>assert.fail(),{getItem(){throw Error('禁用');}},'/'),initial);
  const migrated=await migrateReadingQueue(initial,async(id,state)=>{
    saved.setItem(key,JSON.stringify(['a','b','new-tab-item']));
    if(id==='b')throw Error('网络错误');
    return {...initial,documents:initial.documents.map(d=>d.id===id?{...d,state}:d)};
  },saved,'/');
  assert.equal(migrated.documents[0].state,'reading');
  assert.deepEqual(JSON.parse(saved.getItem(key)),['a','b','new-tab-item']); // The other tab re-added a after its save.
});
