import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import {mkdtemp,mkdir,writeFile,rm,symlink} from 'node:fs/promises';
import {pagesLibrary} from '../scripts/build-pages.mjs';
import {loadLibrary} from '../src/library.mjs';

test('Pages 与本地共同收录 notes 和 inbox，跨目录引用有效，排除归档及原始资料',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'brain-pages-'));
 try{
  for(const dir of ['notes/nested','inbox','trash','sources'])await mkdir(path.join(root,dir),{recursive:true});
  await writeFile(path.join(root,'notes/a.md'),'---\ntitle: 第一篇\naliases: [别名]\ntags: [测试]\n---\n起点 [[b]] [[draft]]');
  await writeFile(path.join(root,'notes/nested/b.md'),'---\ntitle: 第二篇\n---\n终点 [[a]]');
  await writeFile(path.join(root,'inbox/draft.md'),'待学习正文 [[a]]');
  for(const dir of ['trash','sources'])await writeFile(path.join(root,dir,'draft.md'),'不收录的正文');
  const {library,assets}=await pagesLibrary(root);
  assert.deepEqual(library,await loadLibrary(root));
  assert.equal(library.documents.length,3);
  assert.equal(assets.size,0);
  assert.doesNotMatch(JSON.stringify(library),/不收录的正文/);
  assert.deepEqual(library.documents.find(d=>d.id==='a').backlinks,['draft','b']);
  assert.equal(library.documents.find(d=>d.id==='draft').collection,'inbox');
  assert.equal(library.documents.find(d=>d.id==='a').collection,'notes');
  assert.equal(library.documents.find(d=>d.id==='a').references[1].id,'draft');
  assert.deepEqual(library.documents.find(d=>d.id==='draft').backlinks,['a']);
  assert.equal(library.documents.find(d=>d.id==='a').references[0].id,'b');
  await writeFile(path.join(root,'notes/new.md'),'新增文章 [[a]]');
  const next=await pagesLibrary(root);
  assert.equal(next.library.documents.length,4);
  assert.deepEqual(next.library,await loadLibrary(root));
 }finally{await rm(root,{recursive:true,force:true});}
});

test('Pages 导出正文引用的本地附件并改写地址，保留本地附件边界',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'brain-pages-assets-'));
 try{
  await mkdir(path.join(root,'notes/assets'),{recursive:true});
  await writeFile(path.join(root,'notes/assets/图片.png'),'image');
  await writeFile(path.join(root,'notes/assets/file.pdf'),'pdf');
  await writeFile(path.join(root,'notes/assets/unused.png'),'unused');
  await writeFile(path.join(root,'notes/assets/unsupported.svg'),'<svg/>');
  await writeFile(path.join(root,'outside.png'),'outside');
  await symlink(path.join(root,'outside.png'),path.join(root,'notes/assets/escape.png'));
  await writeFile(path.join(root,'notes/a.md'),'![[assets/图片.png]]\n\n[附件](assets/file.pdf)\n\n![[assets/escape.png]]\n\n![[assets/missing.png]]\n\n![[assets/unsupported.svg]]');
  const {library,assets}=await pagesLibrary(root);
  assert.deepEqual([...assets.keys()].sort(),['notes/assets/file.pdf','notes/assets/图片.png']);
  const doc=library.documents[0];
  assert.match(doc.html,/src="\.\/documents\/notes\/assets\/%E5%9B%BE%E7%89%87.png"/);
  assert.match(doc.html,/href="\.\/documents\/notes\/assets\/file.pdf"/);
  assert.doesNotMatch(doc.html,/\/api\/asset|(?:src|href)="\.\/documents\/[^"\s]*(?:escape|missing|unsupported)/);
  assert.equal(doc.body,(await loadLibrary(root)).documents[0].body);
 }finally{await rm(root,{recursive:true,force:true});}
});
