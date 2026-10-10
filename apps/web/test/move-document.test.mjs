import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import {mkdtemp,mkdir,writeFile,readFile,rm,symlink,readdir} from 'node:fs/promises';
import {loadLibrary} from '../src/library.mjs';
import {moveDocument,isLocalWriteRequest} from '../src/move-document.mjs';

async function fixture(t, entries) {
  const root=await mkdtemp(path.join(os.tmpdir(),'brain-move-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  for(const folder of ['inbox','notes','readings','archive'])await mkdir(path.join(root,folder));
  for(const [name,raw] of Object.entries(entries)){
    await mkdir(path.dirname(path.join(root,name)),{recursive:true});
    await writeFile(path.join(root,name),raw);
  }
  return root;
}
const request=async(root,id='a',collection='notes')=>({id,collection,version:(await loadLibrary(root)).version});

test('切换保留正文与 ID、修复显式链接和 parent、可反向移动且无多余文件',async t=>{
  const root=await fixture(t,{
    'inbox/a.md':'---\ntitle: A\nupdated_at: 2026-01-01\n---\n## 章节\n内容 [[./b]]\n',
    'inbox/b.md':'B',
    'notes/ref.md':'---\nparent: "inbox/a#章节"\n---\n[[inbox/a#章节|显示名]] [链接](../inbox/a.md#章节) [[a]]\n',
    'readings/ref2.md':'[引用][a]\n\n[a]: ../inbox/a.md\n',
    'archive/old.md':'[[inbox/a|旧引用]]',
  });
  const before=await loadLibrary(root);
  const after=await moveDocument(root,await request(root));
  assert.equal(after.documents.find(d=>d.id==='a').collection,'notes');
  assert.equal(after.documents.find(d=>d.id==='a').updated,'2026-01-01');
  assert.equal(after.documents.find(d=>d.id==='ref').parent.id,'a');
  assert.equal(after.documents.find(d=>d.id==='ref2').references[0].id,'a');
  assert.match(await readFile(path.join(root,'notes/ref.md'),'utf8'),/notes\/a#章节\|显示名/);
  assert.match(await readFile(path.join(root,'archive/old.md'),'utf8'),/notes\/a/);
  assert.match(await readFile(path.join(root,'notes/a.md'),'utf8'),/\[\[inbox\/b\]\]/);
  assert.ok(!after.documents.some(d=>d.issues.length));
  await moveDocument(root,{id:'a',collection:'inbox',version:after.version});
  assert.equal((await loadLibrary(root)).documents.find(d=>d.id==='a').path,'inbox/a.md');
  assert.deepEqual((await readdir(path.join(root,'notes'))).sort(),['ref.md']);
  assert.equal(before.documents.find(d=>d.id==='a').id,after.documents.find(d=>d.id==='a').id);
});

test('代码示例与行内代码保持原样，移动文章的相对附件保持同一文件',async t=>{
  const raw='## 示例\n`[[inbox/a]]`\n\n```md\n[[inbox/a]]\n```\n\n[[inbox/a]]\n\n![图](./assets/image.png)\n';
  const root=await fixture(t,{'inbox/a.md':raw,'inbox/assets/image.png':'pixels'});
  await moveDocument(root,await request(root));
  const moved=await readFile(path.join(root,'notes/a.md'),'utf8');
  assert.match(moved,/`\[\[inbox\/a\]\]`/);
  assert.match(moved,/```md\n\[\[inbox\/a\]\]\n```/);
  assert.match(moved,/\[\[notes\/a\]\]/);
  assert.match(moved,/!\[图\]\(inbox\/assets\/image.png\)/);
});

test('旧版本、Readings、非法目标和符号链接均拒绝，保留原文件',async t=>{
  const root=await fixture(t,{'inbox/a.md':'原文','readings/r.md':'来源'});
  const old=await request(root);
  await writeFile(path.join(root,'inbox/a.md'),'新内容');
  await assert.rejects(moveDocument(root,old),/知识库已更新/);
  await assert.rejects(moveDocument(root,await request(root,'r')),/只能/);
  await assert.rejects(moveDocument(root,await request(root,'a','../elsewhere')),/参数/);
  await symlink(path.join(root,'inbox/a.md'),path.join(root,'notes/a.md'));
  await assert.rejects(moveDocument(root,await request(root)),/同名文件/);
  assert.equal(await readFile(path.join(root,'inbox/a.md'),'utf8'),'新内容');
});

test('本地写接口必须同源 JSON，拒绝跨站、缺 Origin 和伪造 Host',()=>{
  const headers={host:'127.0.0.1:4173',origin:'http://127.0.0.1:4173','content-type':'application/json','sec-fetch-site':'same-origin'};
  assert.equal(isLocalWriteRequest({headers}),true);
  for(const patch of [{origin:undefined},{origin:'https://evil.example'},{host:'evil.example:4173',origin:'http://evil.example:4173'},{'content-type':'text/plain'},{'sec-fetch-site':'cross-site'}])assert.equal(Boolean(isLocalWriteRequest({headers:{...headers,...patch}})),false);
});
