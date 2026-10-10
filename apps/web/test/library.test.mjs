import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rename, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {parseDocument,renderDocument,resolveDocument,safeAsset,loadLibrary} from '../src/library.mjs';
const doc=(body,file='notes/202610/example.md')=>parseDocument(body,file);
test('支持 YAML 列表、别名、双链章节与块，代码不产生关系',()=>{
 const a=doc('---\ntitle: 测试文档\naliases:\n  - 别名\ntags: [主题]\n---\n## 小节\n\n内容 ^block-1');
 const b=doc('[[example#小节|章节]] [[example#^block-1|块]] [[example#不存在]]\n\n```text\n[[missing]]\n```','notes/202610/test.md');
 const result=renderDocument(b,[a,b]);assert.equal(result.references.length,2);assert.equal(result.issues.length,1);assert.match(result.html,/#\/doc\/example/);assert.equal(resolveDocument('别名',[a],b).doc.id,'example');
 assert.match(renderDocument(a,[a]).html,/id="\^block-1"/);
});
test('未解析和歧义的链接不跳转；嵌入展示原文摘要',()=>{
 const a=doc('第一篇');const b=doc('第二篇','notes/other/example.md');
 assert.equal(resolveDocument('example',[a,b],a).error,'目标不唯一');
 const c=doc('![[example]] [[missing]]','notes/202610/third.md');
 const result=renderDocument(c,[a,c]);assert.match(result.html,/embed-card/);assert.equal(result.issues.length,1);assert.match(result.html,/broken-link/);
});
test('不执行正文 HTML、危险链接及代码中的脚本',()=>{
 const a=doc('<script>alert(1)</script>\n\n[x](javascript:alert%281%29)\n\n```html\n<img src=x onerror=alert(1)>\n```');
 const html=renderDocument(a,[a]).html;assert.doesNotMatch(html,/<script>|href="javascript:|<img src=x/);assert.match(html,/&lt;script&gt;/);
});
test('Mermaid 保留原始源码并标记图表，图内文本不产生链接或执行 HTML',()=>{
 const source='flowchart LR\n A["[[missing]] & <img src=x onerror=alert(1)>"] --> B[完成]';
 const a=doc('```mermaid\n'+source+'\n```\n\n```js\nconst x = 1;\n```');
 const result=renderDocument(a,[a]);
 assert.equal(result.references.length,0);
 assert.equal(result.issues.length,0);
 assert.equal((result.html.match(/class="code-block diagram-block"/g)||[]).length,1);
 assert.match(result.html,/<details class="diagram-source" open>/);
 assert.match(result.html,/\[\[missing\]\] &amp; &lt;img/);
 // The copy control contains trusted SVG; document source must remain escaped.
 assert.doesNotMatch(result.html,/<img/);
 for(const code of result.html.matchAll(/<pre><code>([\s\S]*?)<\/code><\/pre>/g))assert.doesNotMatch(code[1],/<svg/);
 assert.match(result.html,/aria-label="复制源码"/);
 assert.match(result.html,/hljs-keyword/);
 assert.equal(result.body,a.body);
});
test('Mermaid 时序图、多图及大小写围栏在本地与 Pages 中保持一致',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'brain-diagrams-'));
 try{
  await mkdir(path.join(root,'inbox'));
  await writeFile(path.join(root,'inbox/chart.md'),'```mermaid\nsequenceDiagram\n A->>B: 请求<br/>下一行\n```\n\n```Mermaid title\nflowchart TD\n A --> B\n```');
  const {pagesLibrary}=await import('../scripts/build-pages.mjs');
  const local=await loadLibrary(root);
  const {library}=await pagesLibrary(root);
  assert.deepEqual(library,local);
  assert.equal((library.documents[0].html.match(/class="code-block diagram-block"/g)||[]).length,2);
  assert.match(library.documents[0].html,/请求&lt;br\/&gt;下一行/);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('附件限于 content 内 assets，拒绝越界和符号链接',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'brain-assets-'));
 try{await mkdir(path.join(root,'assets'));await writeFile(path.join(root,'assets/a.png'),'x');await symlink('/etc/passwd',path.join(root,'assets/escape.png'));assert.ok(await safeAsset(root,'assets/a.png'));assert.equal(await safeAsset(root,'../../etc/passwd'),null);assert.equal(await safeAsset(root,'assets/escape.png'),null);}finally{await rm(root,{recursive:true,force:true});}
});
test('原文更新后版本、正文、跨目录引用同时重建',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'brain-library-'));
 try{await Promise.all(['notes/202610','inbox'].map(d=>mkdir(path.join(root,d),{recursive:true})));await writeFile(path.join(root,'notes/202610/a.md'),'起点');await writeFile(path.join(root,'notes/202610/b.md'),'终点');await writeFile(path.join(root,'inbox/draft.md'),'待学习 [[a]]');const first=await loadLibrary(root);await writeFile(path.join(root,'notes/202610/a.md'),'更新 [[b]] [[draft]]');const second=await loadLibrary(root);assert.notEqual(first.version,second.version);assert.equal(second.documents.length,3);assert.equal(second.documents.find(d=>d.id==='draft').collection,'inbox');assert.deepEqual(second.documents.find(d=>d.id==='b').backlinks,['a']);assert.match(second.documents.find(d=>d.id==='a').html,/更新/);}finally{await rm(root,{recursive:true,force:true});}
});

test('inbox 迁入 notes 后 ID、正文及引用不变，目录状态和版本更新',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'brain-move-'));
 try{
  await Promise.all(['notes','inbox'].map(d=>mkdir(path.join(root,d))));
  await writeFile(path.join(root,'notes/a.md'),'[[b]]');
  await writeFile(path.join(root,'inbox/b.md'),'学习内容 [[a]]');
  const before=await loadLibrary(root);
  await rename(path.join(root,'inbox/b.md'),path.join(root,'notes/b.md'));
  const after=await loadLibrary(root);
  const b=after.documents.find(d=>d.id==='b');
  assert.equal(b.collection,'notes');assert.equal(b.body,before.documents.find(d=>d.id==='b').body);
  assert.deepEqual(b.backlinks,['a']);assert.deepEqual(b.references.map(r=>r.id),['a']);
  assert.notEqual(before.version,after.version);assert.equal(after.documents.length,2);
  await writeFile(path.join(root,'inbox/b.md'),'重复文件名');
  await assert.rejects(loadLibrary(root),/文档文件名重复/);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('仅有 inbox 或两个收录目录均不存在时也能读取',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'brain-inbox-only-'));
 try{
  assert.equal((await loadLibrary(root)).documents.length,0);
  await mkdir(path.join(root,'inbox'));await writeFile(path.join(root,'inbox/a.md'),'正文');
  assert.equal((await loadLibrary(root)).documents[0].collection,'inbox');
 }finally{await rm(root,{recursive:true,force:true});}
});
