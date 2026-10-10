import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {parseDocument,renderDocument,loadLibrary} from '../src/library.mjs';
import {pagesLibrary} from '../scripts/build-pages.mjs';
import {createServer} from 'vite';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const note=(id,parent,body='正文')=>parseDocument(`---\ntitle: ${id}\n${parent == null?'':`parent: ${JSON.stringify(parent)}\n`}---\n${body}`,`inbox/${id}.md`);
test('parent 支持双链与章节，正文不变且产生真实引用',()=>{
 const root=note('root',null,'## Docker\n说明'),child=note('child','[[root#Docker|Docker 实践]]');
 const r=renderDocument(child,[root,child]);
 assert.equal(r.parent.href,'#/doc/root/docker');assert.equal(r.parent.title,'Docker 实践');
 assert.equal(r.references[0].kind,'parent');assert.equal(r.html,'<p>正文</p>');
 assert.equal(renderDocument(note('other','root'),[root]).parent.id,'root');
});
test('无效目标、章节、自引用、循环与错误类型不产生上级链接',()=>{
 const root=note('root',null,'## Existing');
 for(const parent of ['missing','root#missing','child','[[root']){
  const child=note('child',parent),r=renderDocument(child,[root,child]);
  assert.equal(r.parent,null,parent);assert.equal(r.issues.length,1,parent);
 }
 for(const value of ['',[],{}]) assert.throws(()=>note('child',value),/parent 必须/);
 const a=note('a','b'),b=note('b','a'),c=note('c','a');
 for(const d of [a,b,c])assert.match(renderDocument(d,[a,b,c]).issues[0].reason,/循环/);
 const x={...root,id:'x',path:'inbox/x.md',aliases:['shared']},y={...root,id:'y',path:'inbox/y.md',aliases:['shared']};
 assert.equal(renderDocument(note('child','shared'),[x,y]).parent,null);
});
test('parent 更新影响版本、反链与 Pages 导出',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'brain-parent-'));
 try{
  await mkdir(path.join(dir,'inbox'));
  await writeFile(path.join(dir,'inbox/root.md'),'---\ntitle: 入口\n---\n## Docker');
  await writeFile(path.join(dir,'inbox/child.md'),'---\nparent: "[[root#Docker]]"\n---\n正文');
  const local=await loadLibrary(dir);assert.deepEqual((await pagesLibrary(dir)).library,local);
  assert.deepEqual(local.documents.find(d=>d.id==='root').backlinks,['child']);
  await writeFile(path.join(dir,'inbox/child.md'),'正文');const updated=await loadLibrary(dir);
  assert.notEqual(updated.version,local.version);assert.deepEqual(updated.documents.find(d=>d.id==='root').backlinks,[]);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('阅读上级是安全的导航链接，图谱保留父子关系',async()=>{
 const server=await createServer({root:process.cwd(),configFile:false,optimizeDeps:{noDiscovery:true},server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
 try{
  const {ReaderParent}=await server.ssrLoadModule('/src/neural/ReaderParent.jsx');
  assert.equal(renderToStaticMarkup(React.createElement(ReaderParent,{parent:null})), '');
  const root=note('root',null),child=note('child','root');
  const docs=[root,child].map(d=>({...renderDocument(d,[root,child]),backlinks:[]}));
  const html=renderToStaticMarkup(React.createElement(ReaderParent,{parent:{...docs[1].parent,title:'<script>bad</script>'}}));
  assert.match(html,/aria-label="上级文档"/);assert.match(html,/href="#\/doc\/root"/);assert.doesNotMatch(html,/<script>/);
  const {buildGraph}=await server.ssrLoadModule('/src/neural/graph.js');
  const {galaxyData}=await server.ssrLoadModule('/src/galaxy/data.js');
  assert.equal(galaxyData(buildGraph({documents:docs})).links.length,1);
 }finally{await server.close();}
});
