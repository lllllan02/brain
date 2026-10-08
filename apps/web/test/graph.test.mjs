import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {parseDocument} from '../src/library.mjs';

test('唯一分类动态生成星云，标签不影响分组，分类更新与空库正常',async()=>{
 const server=await createServer({root:process.cwd(),configFile:false,optimizeDeps:{noDiscovery:true},server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
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

test('分类和标签列表展示全部匹配文档，与星图聚焦集合一致', async () => {
 const server=await createServer({root:process.cwd(),configFile:false,optimizeDeps:{noDiscovery:true},server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
 try {
  const {buildGraph}=await server.ssrLoadModule('/src/neural/graph.js');
  const {clusterDocuments}=await server.ssrLoadModule('/src/neural/ClusterList.jsx');
  const {galaxyData,galaxyFocus}=await import('../src/galaxy/data.js');
  const documents=Array.from({length:80},(_,i)=>({id:`note-${i}`,title:`笔记 ${i}`,body:'',category:i<65?'数据库':'系统',tags:i%2?['共享']:['共享扩展'],references:[],backlinks:[]}));
  const graph=buildGraph({documents}), data=galaxyData(graph);
  const category=graph.modules.find(m=>m.title==='数据库').id;
  for (const [cluster,count] of [[{category},65],[{tag:'共享'},40],[{tag:'不存在'},0]]) {
   const rows=clusterDocuments(graph,cluster), focus=galaxyFocus(data,null,cluster.category,cluster.tag);
   assert.equal(rows.length,count);
   assert.deepEqual(new Set(rows.map(n=>n.id)),new Set([...focus.bright].map(i=>data.nodes[i].id)));
  }
  assert.equal(documents[0].id,'note-0');
 } finally {await server.close();}
});

test('内部链接列表按引用顺序去重，排除自身、断链和仅反向引用的文档', async () => {
 const server=await createServer({root:process.cwd(),configFile:false,optimizeDeps:{noDiscovery:true},server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
 try {
  const {buildGraph}=await server.ssrLoadModule('/src/neural/graph.js');
  const {clusterDocuments}=await server.ssrLoadModule('/src/neural/ClusterList.jsx');
  const note=(id,references=[])=>({id,title:id,body:'',category:'示例',tags:[],references:references.map(id=>({id})),backlinks:[]});
  const graph=buildGraph({documents:[note('a',['c','b','c','a','missing','core']),note('b'),note('c',['b']),note('incoming',['a'])]});
  graph.index.get('a').backlinks=['incoming','incoming','a','missing','core'];
  assert.deepEqual(clusterDocuments(graph,{document:'a'}).map(n=>n.id),['c','b']);
  assert.deepEqual(clusterDocuments(graph,{document:'c'}).map(n=>n.id),['b']);
  assert.deepEqual(clusterDocuments(graph,{document:'b'}),[]);
  assert.deepEqual(clusterDocuments(graph,{document:'missing'}),[]);
  assert.deepEqual(clusterDocuments(graph,{document:'a',direction:'incoming'}).map(n=>n.id),['incoming']);
  assert.deepEqual(clusterDocuments(graph,{document:'b',direction:'incoming'}),[]);
  assert.deepEqual(clusterDocuments(graph,{document:'missing',direction:'incoming'}),[]);
  assert.deepEqual(clusterDocuments(graph,null),[]);
 } finally {await server.close();}
});
