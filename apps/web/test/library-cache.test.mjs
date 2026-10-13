import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rename, unlink, rm, stat, utimes } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { loadLibrary, createLibraryLoader } from '../src/library.ts';

test('缓存复用无变化快照；新增、移动、删除、别名变化与冷加载完全一致', async t => {
  const root=await mkdtemp(path.join(os.tmpdir(),'horizon-cache-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  for(const dir of ['readings','notes'])await mkdir(path.join(root,dir));
  const put=(file,body)=>writeFile(path.join(root,file),body);
  await put('readings/a.md','[[别名]]');
  const load=createLibraryLoader(root);let last=await load();
  assert.equal(await load(),last);
  const check=async()=>{const next=await load();assert.notEqual(next,last);assert.deepEqual(next,await loadLibrary(root));last=next;return next;};
  await put('notes/b.md','---\naliases: [别名]\n---\n目标');
  assert.equal((await check()).documents.find(d=>d.id==='a').references[0].id,'b');
  await rename(path.join(root,'notes/b.md'),path.join(root,'readings/b.md'));await check();
  await put('readings/b.md','---\naliases: [新名]\n---\n目标');
  assert.equal((await check()).documents.find(d=>d.id==='a').references.length,0);
  await unlink(path.join(root,'readings/b.md'));await check();
  assert.equal(await load(),last);
});

test('同尺寸且保留 mtime 的编辑仍失效；解析失败后可恢复，并发请求共用一次加载', async t=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'horizon-cache-'));
  t.after(()=>rm(root,{recursive:true,force:true}));await mkdir(path.join(root,'notes'));
  const file=path.join(root,'notes/a.md');await writeFile(file,'before');
  const load=createLibraryLoader(root);const initial=load();assert.equal(load(),initial);const first=await initial;
  const info=await stat(file);await writeFile(file,'after!');await utimes(file,info.atime,info.mtime);
  const second=await load();assert.notEqual(first.version,second.version);assert.match(second.documents[0].body,/after!/);
  await writeFile(file,'---\ncategory: [bad]\n---\ninvalid');await assert.rejects(load(),/category/);
  await writeFile(file,'recovered');assert.deepEqual(await load(),await loadLibrary(root));
  const independent=await loadLibrary(root);independent.documents[0].html='export mutation';
  assert.notEqual((await load()).documents[0].html,'export mutation');
});
