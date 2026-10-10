import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, rename, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {loadLibrary} from '../src/library.mjs';
import {pagesLibrary} from '../scripts/build-pages.mjs';
import {createServer} from 'vite';
import {createSearchIndex, searchDocuments} from '../src/neural/search.js';
import {collectionLabel} from '../src/collections.js';

test('导读迁入 readings 后保留地址、正文、双链与上级，同时进入搜索、图谱及静态导出', async () => {
 const root = await mkdtemp(path.join(os.tmpdir(), 'brain-readings-'));
 const server=await createServer({root:process.cwd(),configFile:false,optimizeDeps:{noDiscovery:true},server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
 try {
  await Promise.all(['notes','inbox','readings','sources','archive'].map(dir => mkdir(path.join(root,dir))));
  await writeFile(path.join(root,'notes/topic.md'),'---\ntitle: 工具接口\n---\n[[guide|外部导读]]');
  const body='---\ntitle: 工具文章导读\nparent: topic\n---\n外部资料摘要\n\n[原文](https://example.com/article)';
  await writeFile(path.join(root,'inbox/guide.md'),body);
  const before=await loadLibrary(root);
  await rename(path.join(root,'inbox/guide.md'),path.join(root,'readings/guide.md'));
  for(const dir of ['sources','archive']) await writeFile(path.join(root,dir,'guide.md'),'不应收录');
  const after=await loadLibrary(root), guide=after.documents.find(d=>d.id==='guide');
  assert.equal(after.documents.length,2);
  assert.equal(guide.collection,'readings');
  assert.equal(collectionLabel(guide.collection),'Readings');
  assert.equal(guide.body,before.documents.find(d=>d.id==='guide').body);
  assert.equal(guide.parent.id,'topic');
  assert.deepEqual(guide.backlinks,['topic']);
  assert.match(after.documents.find(d=>d.id==='topic').html,/#\/doc\/guide/);
  assert.equal(after.documents.flatMap(d=>d.issues).length,0);
  assert.notEqual(after.version,before.version);
  assert.deepEqual(searchDocuments(createSearchIndex(after.documents),'外部资料摘要').map(d=>d.id),['guide']);
  const {buildGraph}=await server.ssrLoadModule('/src/neural/graph.js');
  assert.equal(buildGraph(after).nodes.find(n=>n.id==='guide').collection,'readings');
  assert.deepEqual((await pagesLibrary(root)).library,after);
  await writeFile(path.join(root,'readings/guide.md'),body+'\n更新导读');
  assert.notEqual((await loadLibrary(root)).version,after.version);
 } finally { await server.close(); await rm(root,{recursive:true,force:true}); }
});

test('仅有 readings 时可读取，跨目录重名仍被拒绝',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'brain-reading-only-'));
 try {
  await mkdir(path.join(root,'readings'));
  await writeFile(path.join(root,'readings/guide.md'),'导读');
  assert.equal((await loadLibrary(root)).documents[0].collection,'readings');
  await mkdir(path.join(root,'notes'));
  await writeFile(path.join(root,'notes/guide.md'),'重名');
  await assert.rejects(loadLibrary(root),/文档文件名重复/);
 } finally { await rm(root,{recursive:true,force:true}); }
});
