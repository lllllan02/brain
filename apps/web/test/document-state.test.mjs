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
const withoutStateTime=raw=>raw.replace(/^learning_status_changed_at:[^\r\n]*\r?\n/gm,'');

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
  let lib=await updateDocumentState(root,await request(root,'a','organized'));
  assert.equal(lib.documents.find(d=>d.id==='a').path,'notes/a.md');
  assert.equal(lib.documents.find(d=>d.id==='a').body,before.documents.find(d=>d.id==='a').body);
  assert.equal(withoutStateTime(await readFile(path.join(root,'notes/a.md'),'utf8')),raw.replace('pending #','organized #'));
  assert.ok(Math.abs((await stat(path.join(root,'notes/a.md'))).mtimeMs-time)<1);
  assert.match(lib.documents.find(d=>d.id==='ref').html,/data-state="organized"/);
  assert.match(lib.documents.find(d=>d.id==='ref').html,/--link-color:#e4d0ab/);
  const events=(await observed(lib)).events.filter(e=>e.source==='observed');
  assert.deepEqual(events.map(e=>[e.kind,e.from,e.to]),[['state-changed','pending','organized']]);
  assert.deepEqual(await loader(),lib);
  lib=await updateDocumentState(root,await request(root,'r','organized'));
  assert.match(lib.documents.find(d=>d.id==='ref').html,/data-state="organized"/);
  assert.match(lib.documents.find(d=>d.id==='ref').html,/class="state-check"/);
  assert.equal(lib.documents.find(d=>d.id==='r').state,'organized');
  assert.deepEqual((await pagesLibrary(root)).library,lib);
  await updateDocumentState(root,await request(root,'a','pending'));
  assert.equal(withoutStateTime(await readFile(path.join(root,'notes/a.md'),'utf8')),raw);
  await updateDocumentState(root,await request(root,'r','pending'));
  assert.match(await readFile(path.join(root,'readings/r.md'),'utf8'),/learning_status: pending/);
  assert.equal(await readFile(path.join(root,'notes/ref.md'),'utf8'),'[[a]] [[r]]');
  assert.deepEqual((await readdir(path.join(root,'notes'))).sort(),['a.md','ref.md']);
});

test('非法状态、旧版本和符号链接被拒绝，不覆盖正文',async t=>{
  const root=await fixture(t);await writeFile(path.join(root,'notes/a.md'),'正文');
  await writeFile(path.join(root,'glossary/g.md'),'术语');
  const old=await request(root,'a','organized');await writeFile(path.join(root,'notes/a.md'),'新正文');
  await assert.rejects(updateDocumentState(root,old),/已更新/);
  for(const [id,state] of [['a','read'],['a','../elsewhere'],['missing','pending']])
    await assert.rejects(updateDocumentState(root,await request(root,id,state)),/不支持/);
  await writeFile(path.join(root,'outside.md'),'外部');
  await symlink(path.join(root,'outside.md'),path.join(root,'notes/link.md'));
  await assert.rejects(updateDocumentState(root,await request(root,'link','organized')));
  assert.equal(await readFile(path.join(root,'notes/a.md'),'utf8'),'新正文');
  assert.equal(await readFile(path.join(root,'outside.md'),'utf8'),'外部');
});

test('元数据类型严格校验，缺省状态和共享样式一致',()=>{
  assert.equal(parseDocument('正文','notes/a.md').state,'pending');
  assert.equal(parseDocument('正文','readings/a.md').state,'pending');
  assert.equal(parseDocument('正文','glossary/a.md').state,'pending');
  assert.throws(()=>parseDocument('---\nlearning_status: [organized]\n---\n正文','notes/a.md'),/pending/);
  assert.throws(()=>parseDocument('---\nread: "false"\n---\n正文','readings/a.md'),/布尔/);
  assert.throws(()=>parseDocument('---\nlearning_status: read\n---\n正文','notes/a.md'),/pending/);
  assert.equal(patchDocumentState('正文','read',true),'---\nread: true\n---\n正文');
  const pending={collection:'notes',state:'pending'},done={...pending,state:'organized'};
  assert.notEqual(documentAppearance(pending).color,documentAppearance(done).color);
  assert.equal(documentAppearance({collection:'readings',state:'pending'}).marker.hollow,true);
  assert.equal(documentAppearance({collection:'readings',state:'organized'}).marker.hollow,false);
  assert.equal(matchesDocumentFilter(pending,'state:pending'),true);
  assert.equal(matchesDocumentFilter(done,'state:pending'),false);
});

import {nextDocumentState, stateLabel} from '../src/document-state.ts';
import {reconcileDocumentStates} from '../src/activity.ts';

test('所有目录共用三态，旧完成状态兼容且显式三态优先', async t=>{
  const root=await fixture(t);
  for (const collection of ['notes','readings','glossary']) {
    const id=collection;
    await writeFile(path.join(root,collection,id+'.md'),'正文');
    for (const state of ['reading','organized','pending']) {
      const lib=await updateDocumentState(root,await request(root,id,state));
      assert.equal(lib.documents.find(d=>d.id===id).state,state);
      assert.equal(withoutStateTime(await readFile(path.join(root,collection,id+'.md'),'utf8')),`---\nlearning_status: ${state}\n---\n正文`);
    }
    assert.equal(nextDocumentState({collection,state:'pending'}),'reading');
    assert.equal(nextDocumentState({collection,state:'reading'}),'organized');
    assert.equal(nextDocumentState({collection,state:'organized'}),'pending');
  }
  assert.equal(parseDocument('---\nlearning_status: understood\n---\n正文','notes/old.md').state,'organized');
  assert.equal(parseDocument('---\nread: true\n---\n正文','readings/old.md').state,'organized');
  assert.equal(parseDocument('---\nread: true\nlearning_status: reading\n---\n正文','readings/old.md').state,'reading');
  assert.equal(stateLabel('reading'),'阅读中');
  assert.equal(stateLabel('organized'),'已整理');
});

test('正文变化只将已整理降为阅读中，重启、旧导读与元数据修改遵循同一规则', async t=>{
  const root=await fixture(t);
  for (const [collection,id,status] of [
    ['notes','done','learning_status: organized'],
    ['notes','reading','learning_status: reading'],
    ['notes','pending','learning_status: pending'],
    ['readings','legacy','read: true'],
    ['glossary','term','learning_status: organized'],
  ]) await writeFile(path.join(root,collection,id+'.md'),`---\ntitle: ${id}\n${status}\n---\n旧正文`);
  const initial=await loadLibrary(root);
  assert.equal(await reconcileDocumentStates(root,initial),initial); // First load establishes a baseline.
  await activityForLibrary(root,initial,{observe:true});
  // Metadata-only edits (including a title) do not reset completion.
  const file=path.join(root,'notes/done.md');
  await writeFile(file,(await readFile(file,'utf8')).replace('title: done','title: 新标题\ntags: [元数据]'));
  let lib=await reconcileDocumentStates(root,await loadLibrary(root));
  assert.equal(lib.documents.find(d=>d.id==='done').state,'organized');
  await activityForLibrary(root,lib,{observe:true});
  // Recreate loaders to model a service restart; stored body hashes remain authoritative.
  for (const doc of lib.documents) {
    const file=path.join(root,doc.path);
    await writeFile(file,(await readFile(file,'utf8')).replace('旧正文','新正文'));
  }
  lib=await reconcileDocumentStates(root,await loadLibrary(root));
  for (const doc of lib.documents) {
    assert.equal(doc.state,doc.id==='pending'?'pending':'reading');
    assert.equal(doc.body,'新正文');
  }
  assert.match(await readFile(file,'utf8'),/learning_status: reading/);
  await activityForLibrary(root,lib,{observe:true});
  // Users can confirm the revised body without immediately being downgraded again.
  lib=await updateDocumentState(root,await request(root,'done','organized'));
  assert.equal((await reconcileDocumentStates(root,lib)).documents.find(d=>d.id==='done').state,'organized');
});

test('旧活动快照可用于正文检测，损坏快照不重写文档', async t=>{
  const root=await fixture(t),file=path.join(root,'notes/a.md');
  await writeFile(file,'---\nlearning_status: organized\n---\n正文');
  await activityForLibrary(root,await loadLibrary(root),{observe:true});
  const activityFile=path.join(root,'.activity.json');
  const state=JSON.parse(await readFile(activityFile,'utf8'));
  delete state.documents.a.bodyDigest;
  state.documents.a.state='understood';
  await writeFile(activityFile,JSON.stringify(state));
  await writeFile(file,(await readFile(file,'utf8'))+'\n新增');
  assert.equal((await reconcileDocumentStates(root,await loadLibrary(root))).documents[0].state,'reading');
  await writeFile(activityFile,'broken');
  const before=await readFile(file,'utf8');
  await assert.rejects(reconcileDocumentStates(root,await loadLibrary(root)),/JSON|Unexpected/);
  assert.equal(await readFile(file,'utf8'),before);
});


test('修改未完成正文时同时明确确认已整理，不被误当作旧完成文档降级', async t=>{
  const root=await fixture(t),file=path.join(root,'notes/a.md');
  for (const state of ['pending','reading']) {
    await writeFile(file,`---\nlearning_status: ${state}\n---\n旧正文`);
    await activityForLibrary(root,await loadLibrary(root),{observe:true});
    await writeFile(file,'---\nlearning_status: organized\n---\n用户确认的新正文');
    assert.equal((await reconcileDocumentStates(root,await loadLibrary(root))).documents[0].state,'organized');
  }
});

test('缓存写回只更新目标及入站引用，结果与完整重建一致；并发内容修改仍拒绝覆盖', async t=>{
  const root=await fixture(t);
  await writeFile(path.join(root,'notes/a.md'),'---\nlearning_status: pending\n---\n正文');
  await writeFile(path.join(root,'notes/ref.md'),'[[a]] ![[a]]');
  await writeFile(path.join(root,'notes/other.md'),'无关正文');
  const load=createLibraryLoader(root),before=await load();
  const current=await updateDocumentState(root,{id:'a',state:'reading',version:before.version},load);
  assert.equal(current.documents.find(d=>d.id==='other'),before.documents.find(d=>d.id==='other'));
  assert.notEqual(current.documents.find(d=>d.id==='ref'),before.documents.find(d=>d.id==='ref'));
  assert.match(current.documents.find(d=>d.id==='ref').html,/data-state="reading"/);
  assert.deepEqual(current,await loadLibrary(root));
  const original=await readFile(path.join(root,'notes/a.md'),'utf8');
  let calls=0;
  await assert.rejects(updateDocumentState(root,{id:'a',state:'organized',version:current.version},async()=>{
    if(++calls===2)await writeFile(path.join(root,'notes/other.md'),'其他编辑的正文');
    return load();
  }),/其他编辑/);
  assert.equal(await readFile(path.join(root,'notes/a.md'),'utf8'),original);
  assert.equal(await readFile(path.join(root,'notes/other.md'),'utf8'),'其他编辑的正文');
});

test('实际状态变化记录独立时间，重复设置同状态及正文编辑不刷新；正文时间保持不变',async t=>{
  const root=await fixture(t),file=path.join(root,'notes/a.md');
  await writeFile(file,'---\nlearning_status: pending\nupdated_at: "2026-01-01"\n---\n正文');
  let lib=await updateDocumentState(root,await request(root,'a','reading'));
  const time=lib.documents[0].stateChangedAt;
  assert.match(time,/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}\+08:00$/);
  const raw=await readFile(file,'utf8');
  assert.match(raw,/learning_status_changed_at: "/);
  assert.equal(lib.documents[0].updated,'2026-01-01');
  await updateDocumentState(root,await request(root,'a','reading'));
  assert.equal(await readFile(file,'utf8'),raw);
  await writeFile(file,raw.replace('正文','修改正文'));
  lib=await loadLibrary(root);
  assert.equal(lib.documents[0].stateChangedAt,time);
  lib=await updateDocumentState(root,await request(root,'a','organized'));
  assert.ok(Date.parse(lib.documents[0].stateChangedAt)>=Date.parse(time));
  assert.equal(lib.documents[0].body,'修改正文');
});
