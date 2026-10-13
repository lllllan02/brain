import test from 'node:test';
import assert from 'node:assert/strict';
import {isLocalWriteRequest} from '../src/update-document-state.ts';
test('本地写接口必须同源 JSON，拒绝跨站、缺 Origin 和伪造 Host',()=>{
  const headers={host:'127.0.0.1:4173',origin:'http://127.0.0.1:4173','content-type':'application/json','sec-fetch-site':'same-origin'};
  assert.equal(isLocalWriteRequest({headers}),true);
  for(const patch of [{origin:undefined},{origin:'https://evil.example'},{host:'evil.example:4173',origin:'http://evil.example:4173'},{'content-type':'text/plain'},{'sec-fetch-site':'cross-site'}])assert.equal(Boolean(isLocalWriteRequest({headers:{...headers,...patch}})),false);
});

import {mkdtemp, mkdir, readFile, writeFile, readdir, stat, rm, symlink} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {loadLibrary, createLibraryLoader, parseDocument} from '../src/library.ts';
import {updateDocumentState, patchDocumentState} from '../src/update-document-state.ts';
import {documentAppearance, matchesDocumentFilter} from '../src/document-state.ts';
import {activityForLibrary} from '../src/activity.ts';
import {pagesLibrary} from '../scripts/build-pages.ts';
async function fixture(t) {
  const root=await mkdtemp(path.join(os.tmpdir(),'horizon-state-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  for(const dir of ['notes','readings','glossary']) await mkdir(path.join(root,dir));
  return root;
}
const request=async(root,id,state)=>({id,state,version:(await loadLibrary(root)).version});

test('状态写回只改变属性，双向切换同时更新入站高亮、缓存和静态导出',async t=>{
  const root=await fixture(t);
  const raw='---\r\ntitle: 笔记\r\nupdated_at: "2026-01-01" # 保留注释\r\nlearning_status: pending # 学习\r\n---\r\n正文 `code`\r\n';
  await writeFile(path.join(root,'notes/a.md'),raw);
  await writeFile(path.join(root,'readings/r.md'),'---\ntitle: 导读\nsource: https://example.com\n---\n原文');
  await writeFile(path.join(root,'notes/ref.md'),'[[a]] [[r]]');
  const before=await loadLibrary(root),time=(await stat(path.join(root,'notes/a.md'))).mtimeMs;
  const loader=createLibraryLoader(root);await loader();
  const observed=lib=>activityForLibrary(root,lib,{observe:true,now:'2026-10-13T10:00:00+08:00'});
  await observed(before);
  let lib=await updateDocumentState(root,await request(root,'a','understood'));
  assert.equal(lib.documents.find(d=>d.id==='a').path,'notes/a.md');
  assert.equal(lib.documents.find(d=>d.id==='a').body,before.documents.find(d=>d.id==='a').body);
  assert.equal(await readFile(path.join(root,'notes/a.md'),'utf8'),raw.replace('pending #','understood #'));
  assert.ok(Math.abs((await stat(path.join(root,'notes/a.md'))).mtimeMs-time)<1);
  assert.match(lib.documents.find(d=>d.id==='ref').html,/data-state="understood"/);
  assert.match(lib.documents.find(d=>d.id==='ref').html,/--link-color:#e4d0ab/);
  const events=(await observed(lib)).events.filter(e=>e.source==='observed');
  assert.deepEqual(events.map(e=>[e.kind,e.from,e.to]),[['state-changed','pending','understood']]);
  assert.deepEqual(await loader(),lib);
  lib=await updateDocumentState(root,await request(root,'r','read'));
  assert.match(lib.documents.find(d=>d.id==='ref').html,/data-state="read"/);
  assert.match(lib.documents.find(d=>d.id==='ref').html,/class="state-check"/);
  assert.equal(lib.documents.find(d=>d.id==='r').state,'read');
  assert.deepEqual((await pagesLibrary(root)).library,lib);
  await updateDocumentState(root,await request(root,'a','pending'));
  assert.equal(await readFile(path.join(root,'notes/a.md'),'utf8'),raw);
  await updateDocumentState(root,await request(root,'r','unread'));
  assert.match(await readFile(path.join(root,'readings/r.md'),'utf8'),/read: false/);
  assert.equal(await readFile(path.join(root,'notes/ref.md'),'utf8'),'[[a]] [[r]]');
  assert.deepEqual((await readdir(path.join(root,'notes'))).sort(),['a.md','ref.md']);
});

test('非法状态、旧版本、术语和符号链接被拒绝，不覆盖正文',async t=>{
  const root=await fixture(t);await writeFile(path.join(root,'notes/a.md'),'正文');
  await writeFile(path.join(root,'glossary/g.md'),'术语');
  const old=await request(root,'a','understood');await writeFile(path.join(root,'notes/a.md'),'新正文');
  await assert.rejects(updateDocumentState(root,old),/已更新/);
  for(const [id,state] of [['a','read'],['a','../elsewhere'],['g','understood'],['missing','pending']])
    await assert.rejects(updateDocumentState(root,await request(root,id,state)),/不支持/);
  await writeFile(path.join(root,'outside.md'),'外部');
  await symlink(path.join(root,'outside.md'),path.join(root,'notes/link.md'));
  await assert.rejects(updateDocumentState(root,await request(root,'link','understood')));
  assert.equal(await readFile(path.join(root,'notes/a.md'),'utf8'),'新正文');
  assert.equal(await readFile(path.join(root,'outside.md'),'utf8'),'外部');
});

test('元数据类型严格校验，缺省状态和共享样式一致',()=>{
  assert.equal(parseDocument('正文','notes/a.md').state,'pending');
  assert.equal(parseDocument('正文','readings/a.md').state,'unread');
  assert.equal(parseDocument('正文','glossary/a.md').state,null);
  assert.throws(()=>parseDocument('---\nlearning_status: [understood]\n---\n正文','notes/a.md'),/pending/);
  assert.throws(()=>parseDocument('---\nread: "false"\n---\n正文','readings/a.md'),/布尔/);
  assert.throws(()=>parseDocument('---\nlearning_status: read\n---\n正文','notes/a.md'),/pending/);
  assert.equal(patchDocumentState('正文','read',true),'---\nread: true\n---\n正文');
  const pending={collection:'notes',state:'pending'},done={...pending,state:'understood'};
  assert.notEqual(documentAppearance(pending).color,documentAppearance(done).color);
  assert.equal(documentAppearance({collection:'readings',state:'unread'}).marker.hollow,true);
  assert.equal(documentAppearance({collection:'readings',state:'read'}).marker.hollow,false);
  assert.equal(matchesDocumentFilter(pending,'state:pending'),true);
  assert.equal(matchesDocumentFilter(done,'state:pending'),false);
});
