import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createServer} from 'vite';
import {parseDocument,loadLibrary} from '../src/library.mjs';
test('原场景适配真实文档，不生成推测关系或创作指标',async()=>{
 const server=await createServer({root:process.cwd(),configFile:false,server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
 try{const {buildGraph,forceLayout}=await server.ssrLoadModule('/src/neural/graph.js');const library=await loadLibrary(path.resolve('../../content'));const graph=buildGraph(library);const content=graph.nodes.filter(n=>n.module);
 assert.equal(content.length,library.documents.length);assert.equal(new Set(content.map(n=>n.id)).size,content.length);assert.deepEqual(new Set(graph.modules.map(m=>m.title)),new Set(library.documents.map(d=>d.category)));
 const actual=new Set(library.documents.flatMap(d=>d.references.filter(r=>r.id!==d.id).map(r=>d.id+'|'+r.id)));
 const displayed=new Set(graph.links.filter(l=>l.kind==='wiki').flatMap(l=>[...(l.ab?[l.a+'|'+l.b]:[]),...(l.ba?[l.b+'|'+l.a]:[])]));assert.deepEqual(displayed,actual);
 assert.ok(graph.links.every(l=>['contain','wiki'].includes(l.kind)));assert.ok(content.every(n=>!n.post&&!n.idea&&!n.draft));
 const layout=forceLayout(graph);assert.ok(graph.nodes.every(n=>layout[n.id].every(Number.isFinite)));assert.equal(graph.modules.find(m=>m.id===graph.index.get('mysql-explain').module).title,'MySQL');assert.equal(graph.modules.find(m=>m.id===graph.index.get('rag-overview').module).title,'RAG');assert.ok(!graph.index.has('index'));
 }finally{await server.close();}
});

test('唯一分类动态生成星云，标签不影响分组，分类更新与空库正常',async()=>{
 const server=await createServer({root:process.cwd(),configFile:false,server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
 try{
  const {buildGraph,forceLayout,moduleOf}=await server.ssrLoadModule('/src/neural/graph.js');
  const {moduleItems}=await server.ssrLoadModule('/src/neural/Home.jsx');
  const doc=(raw,id)=>({...parseDocument(raw,'notes/202610/'+id+'.md'),references:[],backlinks:[]});
  const a=doc('---\ncategory: 数据库\ntags: [检索, 操作系统]\ntype: overview\n---\n正文','rag-arbitrary');
  const b=doc('---\nclasses: [concept]\ntags: [数据库]\n---\n无分类','b');
  const c=doc('---\ncategory: 操作系统\n---\n第二篇','c');
  const graph=buildGraph({documents:[a,b,c]});
  assert.deepEqual(new Set(graph.modules.map(m=>m.title)),new Set(['数据库','操作系统','未分类']));
  const database=graph.modules.find(m=>m.title==='数据库'),os=graph.modules.find(m=>m.title==='操作系统');
  assert.equal(graph.nodes.filter(n=>n.module).length,3);
  assert.deepEqual(moduleItems(graph,database.id).map(n=>n.id),['rag-arbitrary']);
  assert.deepEqual(moduleItems(graph,os.id).map(n=>n.id),['c']);
  assert.equal(graph.links.filter(l=>l.kind==='contain'&&(l.a===a.id||l.b===a.id)).length,1);
  assert.equal(moduleOf(graph,graph.index.get(a.id),os.id).id,database.id);
  const layout=forceLayout(graph);assert.ok(graph.nodes.every(n=>layout[n.id].every(Number.isFinite)));
  const changed=buildGraph({documents:[{...a,category:'新分类/子分类'}]});
  assert.deepEqual(changed.modules.map(m=>m.title),['新分类/子分类']);
  assert.equal(moduleItems(changed,database.id).length,0);
  assert.equal(buildGraph({documents:[]}).modules.length,0);
  const alone=buildGraph({documents:[b]});assert.equal(alone.modules[0].title,'未分类');assert.ok(Object.values(forceLayout(alone)).flat().every(Number.isFinite));
  const reversed=buildGraph({documents:[c,b,a]});assert.deepEqual(reversed.modules,graph.modules);
  assert.equal(parseDocument('---\ncategory: "  "\n---\n正文','empty.md').category,'');
  assert.throws(()=>parseDocument('---\ncategory: [数据库, 操作系统]\n---\n正文','invalid.md'),/category 必须是单个文本/);
 }finally{await server.close();}
});
