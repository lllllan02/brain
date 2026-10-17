import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, utimes } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { startServer } from '../server.ts';
import { parseLibrary } from '../src/data/library-schema.ts';
import { loadLibrary } from '../src/library.ts';
import { activityForLibrary } from '../src/activity.ts';

test('旧活动锁残留后恢复快照，修改过的已整理文档可以重新确认且不会弹回', async t => {
  const root=await mkdtemp(path.join(os.tmpdir(),'horizon-stale-lock-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  await mkdir(path.join(root,'notes'));
  const file=path.join(root,'notes/wal.md');
  await writeFile(file,'---\ntitle: WAL\nlearning_status: understood\n---\n旧正文');
  await activityForLibrary(root,await loadLibrary(root),{observe:true});
  const activityFile=path.join(root,'.activity.json');
  const old=JSON.parse(await readFile(activityFile,'utf8'));
  delete old.documents.wal.bodyDigest;
  await writeFile(activityFile,JSON.stringify(old));
  await writeFile(file,'---\ntitle: WAL\nlearning_status: reading\n---\n新正文');
  const lock=activityFile+'.lock';
  await mkdir(lock);
  const past=new Date(Date.now()-120_000);
  await utimes(lock,past,past);
  const app=await startServer({root,port:0,optimizeDependencies:false,development:true});
  t.after(()=>app.close());
  const url=`http://127.0.0.1:${app.server.address().port}`;
  const initial=parseLibrary(await (await fetch(url+'/api/library')).json());
  assert.equal(initial.activity.error,undefined);
  assert.ok(old.events.every(event=>initial.activity.events.some(e=>e.id===event.id)));
  const response=await fetch(url+'/api/documents/state',{
    method:'POST',headers:{Origin:url,'Content-Type':'application/json'},
    body:JSON.stringify({id:'wal',state:'organized',version:initial.version,incremental:true}),
  });
  assert.equal(response.status,200);
  const updated=await response.json();
  assert.equal(updated.documents.find(d=>d.id==='wal').state,'organized');
  for(let i=0;i<2;i++) {
    const current=parseLibrary(await (await fetch(url+'/api/library')).json());
    assert.equal(current.documents.find(d=>d.id==='wal').state,'organized');
    assert.equal(current.activity.error,undefined);
  }
  assert.match(await readFile(file,'utf8'),/learning_status: organized/);
  assert.match(await readFile(file,'utf8'),/新正文$/);
});

test('本地接口条件请求、内容刷新、版本冲突和状态写回保持一致', async t => {
  const root=await mkdtemp(path.join(os.tmpdir(),'horizon-http-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  for(const dir of ['notes','readings'])await mkdir(path.join(root,dir));
  const file=path.join(root,'notes/a.md');await writeFile(file,'---\ntitle: Test\n---\nfirst');
  const app=await startServer({root,port:0,optimizeDependencies:false,development:true});t.after(()=>app.close());
  const url=`http://127.0.0.1:${app.server.address().port}`;
  const first=await fetch(url+'/api/library');const etag=first.headers.get('etag');
  const library=parseLibrary(await first.json());assert.ok(etag);
  const unchanged=await fetch(url+'/api/library',{headers:{'If-None-Match':etag}});
  assert.equal(unchanged.status,304);assert.equal(await unchanged.text(),'');
  await writeFile(file,'---\ntitle: Test\n---\nsecond');
  const changed=await fetch(url+'/api/library',{headers:{'If-None-Match':etag}});
  assert.equal(changed.status,200);assert.notEqual(changed.headers.get('etag'),etag);
  const next=parseLibrary(await changed.json());
  const move=(version)=>fetch(url+'/api/documents/state',{method:'POST',headers:{'Content-Type':'application/json',Origin:url},body:JSON.stringify({id:'a',state:'organized',version})});
  assert.equal((await move(library.version)).status,409);
  const moved=await move(next.version);assert.equal(moved.status,200);
  const movedLibrary=parseLibrary(await moved.json());assert.equal(movedLibrary.documents[0].state,'organized');
  assert.deepEqual(parseLibrary(await (await fetch(url+'/api/library')).json()).documents,movedLibrary.documents);
  await writeFile(file,(await readFile(file,'utf8')).replace('title: Test','title: Renamed'));
  assert.equal(parseLibrary(await (await fetch(url+'/api/library')).json()).documents[0].state,'organized');
  await writeFile(file,(await readFile(file,'utf8')).replace('second','third'));
  const edited=parseLibrary(await (await fetch(url+'/api/library')).json());
  assert.equal(edited.documents[0].state,'reading');
  assert.match(await readFile(file,'utf8'),/learning_status: reading/);
  await writeFile(file,(await readFile(file,'utf8')).replace('third','fourth'));
  assert.equal(parseLibrary(await (await fetch(url+'/api/library')).json()).documents[0].state,'reading');

  for(const body of ['null','[]','"text"','{"id":1}']) {
    const invalid=await fetch(url+'/api/documents/state',{method:'POST',headers:{Origin:url,'Content-Type':'application/json'},body});
    assert.equal(invalid.status,400);
  }
  const denied=await fetch(url+'/api/documents/state',{method:'POST',headers:{Origin:'https://example.com'}});assert.equal(denied.status,403);
});

test('增量状态响应包含目标与入站高亮，省略无关正文，版本及磁盘状态一致',async t=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'horizon-state-patch-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  await mkdir(path.join(root,'notes'));
  await writeFile(path.join(root,'notes/a.md'),'正文');
  await writeFile(path.join(root,'notes/ref.md'),'[[a]]');
  await writeFile(path.join(root,'notes/unrelated.md'),'独立正文。'.repeat(5000));
  const app=await startServer({root,port:0,optimizeDependencies:false,development:true});t.after(()=>app.close());
  const url=`http://127.0.0.1:${app.server.address().port}`;
  const initial=await (await fetch(url+'/api/library')).json();
  const response=await fetch(url+'/api/documents/state',{method:'POST',headers:{Origin:url,'Content-Type':'application/json'},body:JSON.stringify({id:'a',state:'reading',version:initial.version,incremental:true})});
  assert.equal(response.status,200);
  const patch=await response.json();
  assert.equal(patch.kind,'state-update');assert.equal(patch.baseVersion,initial.version);
  assert.deepEqual(patch.documents.map(d=>d.id).sort(),['a','ref']);
  assert.match(patch.documents.find(d=>d.id==='ref').html,/data-state="reading"/);
  assert.ok(JSON.stringify(patch).length<JSON.stringify(initial).length/5);
  assert.match(await readFile(path.join(root,'notes/a.md'),'utf8'),/learning_status: reading/);
  const current=parseLibrary(await (await fetch(url+'/api/library')).json());
  assert.equal(patch.version,current.version);
  const unchanged=await fetch(url+'/api/library',{headers:{'If-None-Match':response.headers.get('etag')}});
  assert.equal(unchanged.status,304);
  assert.deepEqual(current.documents,initial.documents.map(d=>patch.documents.find(p=>p.id===d.id)??d));
});
