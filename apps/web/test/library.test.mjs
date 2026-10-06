import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {parseDocument,renderDocument,resolveDocument,safeAsset,loadLibrary} from '../src/library.mjs';
const doc=(body,file='notes/202610/example.md')=>parseDocument(body,file);
test('真实知识库可渲染：双链表格、目录与反链',async()=>{
 const library=await loadLibrary(path.resolve('../../content'));
 assert.ok(library.documents.length > 0);
 const explain=library.documents.find(d=>d.id==='mysql-explain');
 assert.match(explain.html,/<table>/);assert.equal(explain.references.length,7);
 assert.ok(explain.toc.some(h=>h.title==='字段总览'));
 assert.ok(library.documents.find(d=>d.id==='mysql-explain-type').backlinks.includes('mysql-explain'));
 assert.deepEqual(library.documents.flatMap(d=>d.issues),[]);
});
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
test('附件限于 content 内 assets，拒绝越界和符号链接',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'brain-assets-'));
 try{await mkdir(path.join(root,'assets'));await writeFile(path.join(root,'assets/a.png'),'x');await symlink('/etc/passwd',path.join(root,'assets/escape.png'));assert.ok(await safeAsset(root,'assets/a.png'));assert.equal(await safeAsset(root,'../../etc/passwd'),null);assert.equal(await safeAsset(root,'assets/escape.png'),null);}finally{await rm(root,{recursive:true,force:true});}
});
test('原文更新后版本、正文、引用同时重建；inbox 不进入索引',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'brain-library-'));
 try{await Promise.all(['notes/202610','inbox'].map(d=>mkdir(path.join(root,d),{recursive:true})));await writeFile(path.join(root,'notes/202610/a.md'),'起点');await writeFile(path.join(root,'notes/202610/b.md'),'终点');await writeFile(path.join(root,'inbox/private.md'),'不收录');const first=await loadLibrary(root);await writeFile(path.join(root,'notes/202610/a.md'),'更新 [[b]]');const second=await loadLibrary(root);assert.notEqual(first.version,second.version);assert.equal(second.documents.length,2);assert.deepEqual(second.documents.find(d=>d.id==='b').backlinks,['a']);assert.match(second.documents.find(d=>d.id==='a').html,/更新/);}finally{await rm(root,{recursive:true,force:true});}
});
