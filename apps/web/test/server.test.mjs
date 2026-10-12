import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { startServer } from '../server.ts';
import { parseLibrary } from '../src/data/library-schema.ts';

test('本地接口条件请求、内容刷新、版本冲突和文件移动保持一致', async t => {
  const root=await mkdtemp(path.join(os.tmpdir(),'horizon-http-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  for(const dir of ['inbox','notes'])await mkdir(path.join(root,dir));
  const file=path.join(root,'inbox/a.md');await writeFile(file,'---\ntitle: Test\n---\nfirst');
  const app=await startServer({root,port:0,optimizeDependencies:false});t.after(()=>app.close());
  const url=`http://127.0.0.1:${app.server.address().port}`;
  const first=await fetch(url+'/api/library');const etag=first.headers.get('etag');
  const library=parseLibrary(await first.json());assert.ok(etag);
  const unchanged=await fetch(url+'/api/library',{headers:{'If-None-Match':etag}});
  assert.equal(unchanged.status,304);assert.equal(await unchanged.text(),'');
  await writeFile(file,'---\ntitle: Test\n---\nsecond');
  const changed=await fetch(url+'/api/library',{headers:{'If-None-Match':etag}});
  assert.equal(changed.status,200);assert.notEqual(changed.headers.get('etag'),etag);
  const next=parseLibrary(await changed.json());
  const move=(version)=>fetch(url+'/api/documents/move',{method:'POST',headers:{'Content-Type':'application/json',Origin:url},body:JSON.stringify({id:'a',collection:'notes',version})});
  assert.equal((await move(library.version)).status,409);
  const moved=await move(next.version);assert.equal(moved.status,200);
  const movedLibrary=parseLibrary(await moved.json());assert.equal(movedLibrary.documents[0].collection,'notes');
  assert.deepEqual(parseLibrary(await (await fetch(url+'/api/library')).json()).documents,movedLibrary.documents);
  for(const body of ['null','[]','"text"','{"id":1}']) {
    const invalid=await fetch(url+'/api/documents/move',{method:'POST',headers:{Origin:url,'Content-Type':'application/json'},body});
    assert.equal(invalid.status,400);
  }
  const denied=await fetch(url+'/api/documents/move',{method:'POST',headers:{Origin:'https://example.com'}});assert.equal(denied.status,403);
});
