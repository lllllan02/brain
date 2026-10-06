import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createServer} from 'vite';
import {loadLibrary} from '../src/library.mjs';
test('原场景适配真实文档，不生成推测关系或创作指标',async()=>{
 const server=await createServer({root:process.cwd(),configFile:false,server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
 try{const {buildGraph,forceLayout,MODULES}=await server.ssrLoadModule('/src/neural/graph.js');const library=await loadLibrary(path.resolve('../../content'));const graph=buildGraph(library);const content=graph.nodes.filter(n=>n.module);
 assert.equal(content.length,library.documents.length);assert.equal(new Set(content.map(n=>n.id)).size,content.length);assert.equal(MODULES.length,5);
 const actual=new Set(library.documents.flatMap(d=>d.references.filter(r=>r.id!==d.id).map(r=>d.id+'|'+r.id)));
 const displayed=new Set(graph.links.filter(l=>l.kind==='wiki').flatMap(l=>[...(l.ab?[l.a+'|'+l.b]:[]),...(l.ba?[l.b+'|'+l.a]:[])]));assert.deepEqual(displayed,actual);
 assert.ok(graph.links.every(l=>['contain','wiki'].includes(l.kind)));assert.ok(content.every(n=>!n.post&&!n.idea&&!n.draft));
 const layout=forceLayout(graph);assert.ok(graph.nodes.every(n=>layout[n.id].every(Number.isFinite)));assert.equal(graph.index.get('mysql-explain').module,'methods');assert.equal(graph.index.get('rag-overview').module,'concepts');assert.equal(graph.index.get('index').module,'drafts');
 }finally{await server.close();}
});
