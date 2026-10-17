import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {galaxyData, galaxyFocus, readingFilter} from '../src/galaxy/data.ts';

const note = (id, module, deg = 0) => ({id, title:id, body:'正文', module, deg, in:0, out:deg, tags:[]});
test('星系适配只包含文档和真实引用，保留孤立文档及稳定 ID', () => {
  const graph = {nodes:[{id:'core'}, {id:'folder'},note('b','sql',1),note('a','sql',1),note('孤立','rag')],links:[
    {a:'core',b:'folder',kind:'contain'}, {a:'folder',b:'a',kind:'contain'},
    {a:'a',b:'b',kind:'wiki'}, {a:'a',b:'missing',kind:'wiki'},
  ]};
  const data = galaxyData(graph);
  assert.deepEqual(data.nodes.map(n=>n.id),['b','a','孤立']);
  assert.deepEqual(data.links,[{source:1,target:0}]);
  assert.equal(data.nodes[0].fileSize,6);
  assert.deepEqual(galaxyData({nodes:[],links:[]}),{nodes:[],links:[]});
});

test('文档聚焦只高亮一度邻居，分类聚焦不伪造关系', () => {
  const data={nodes:[{id:'a',folderTop:'one'},{id:'b',folderTop:'two'},{id:'c',folderTop:'one'},{id:'d',folderTop:'two'}],links:[{source:0,target:1},{source:1,target:2}]};
  const selected=galaxyFocus(data,'a','one');
  assert.deepEqual([...selected.bright],[0,1]); assert.deepEqual(selected.links,[0]);
  const category=galaxyFocus(data,null,'one');
  assert.deepEqual([...category.bright],[0,2]); assert.deepEqual(category.links,[]);
  assert.equal(galaxyFocus(data,null,null).active,false);
  assert.deepEqual([...galaxyFocus(data,'d',null).bright],[3]);
  assert.equal(galaxyFocus({nodes:[],links:[]},'deleted',null).active,false);
});

test('三维布局及显示变换对空库、单篇和关联文档产生有限坐标',async()=>{
  const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true},server:{middlewareMode:true,hmr:false,ws:false}});
  try{
    const {MainThreadForceLayout}=await server.ssrLoadModule('/src/galaxy/vendor/layout/MainThreadForceLayout.ts');
    const {seedPosition}=await server.ssrLoadModule('/src/galaxy/vendor/data/seed.ts');
    const {fitGraphPositions}=await server.ssrLoadModule('/src/galaxy/vendor/render/graphTransform.ts');
    for(const nodes of [[],[note('a','one')],[note('a','one',1),note('b','one',1),note('c','two')]]){
      const data=galaxyData({nodes,links:nodes.length>1?[{a:'a',b:'b',kind:'wiki'}]:[]});
      const positions=new Float32Array(nodes.length*3);
      data.nodes.forEach((n,i)=>positions.set(seedPosition(n.id,45),i*3));
      const layout=new MainThreadForceLayout();
      layout.init(data,positions,{charge:-150,linkDistance:70,linkStrength:.9,centerPull:.03,flatten:.15,coreGravity:.03,spiral:0,velocityDecay:.4});
      for(let i=0;i<350&&!layout.isSettled();i++)layout.step();
      assert.ok(layout.isSettled());assert.ok([...positions].every(Number.isFinite));
      const display=new Float32Array(positions.length);fitGraphPositions(positions,display,nodes.length,280);
      assert.ok([...display].every(Number.isFinite));layout.dispose();
    }
  }finally{await server.close();}
});

test('标签聚焦跨分类匹配全部同名标签，仅保留匹配文档之间的真实引用', () => {
  const data = {nodes:[
    {id:'a',folderTop:'one',tags:['索引','MySQL']},
    {id:'b',folderTop:'two',tags:['索引']},
    {id:'c',folderTop:'one',tags:['索引优化']},
    {id:'d',folderTop:'two',tags:[]},
  ],links:[{source:0,target:1},{source:0,target:2},{source:1,target:3}]};
  const focus = galaxyFocus(data,null,null,'索引');
  assert.deepEqual([...focus.bright],[0,1]);
  assert.deepEqual(focus.links,[0]);
  assert.equal(focus.index,-1);
  assert.equal(focus.active,true);
  assert.deepEqual([...galaxyFocus(data,null,'one').bright],[0,2]);
  assert.deepEqual([...galaxyFocus(data,null,null,'不存在').bright],[]);
  assert.equal(galaxyFocus(data,null,null).active,false);
});

test('目录状态传入星图，inbox 保留目录标记且不改变真实引用',()=>{
 const data=galaxyData({nodes:[{...note('a','one'),collection:'notes'},{...note('b','one'),collection:'inbox'}],links:[{a:'a',b:'b',kind:'wiki'}]});
 assert.deepEqual(data.nodes.map(n=>n.collection),['notes','inbox']);
 assert.deepEqual(data.links,[{source:0,target:1}]);
});

test('阅读筛选保留全部同组节点，不改动布局数据，分类与目录独立匹配', () => {
  const data = {nodes: Array.from({length:300}, (_,i) => ({id:`n-${i}`, folderTop:i < 200 ? 'a' : 'b', collection:i % 2 ? 'notes' : 'inbox'})), links:[]};
  const original = structuredClone(data);
  const category = readingFilter(data, 0, 'category');
  const collection = readingFilter(data, 0, 'collection');
  assert.equal(category.size, 200);
  assert.equal(collection.size, 150);
  assert.ok(category.has(199));
  assert.ok(!category.has(200));
  assert.ok(collection.has(298));
  assert.ok(!collection.has(199));
  assert.equal(readingFilter(data, -1, 'category'), null);
  assert.deepEqual(data, original);
});

test('节点重排和元数据变化不重建图形缓冲，增删节点或引用更新缓冲', async () => {
  const {galaxyTopologyKey}=await import('../src/galaxy/data.ts');
  const graph={nodes:[{...note('a','one'),collection:'inbox'},{...note('b','one'),collection:'notes'}],links:[{a:'a',b:'b',kind:'wiki'}],modules:[]};
  const moved=structuredClone(graph);moved.nodes[0].collection='notes';moved.nodes[0].module='two';moved.nodes[0].title='新标题';moved.nodes[0].body += '移动后改写的相对引用';moved.nodes.reverse();
  assert.equal(galaxyTopologyKey(galaxyData(graph)),galaxyTopologyKey(galaxyData(moved)));
  for(const mutate of [v=>v.nodes.pop(),v=>v.links=[]]) {
    const next=structuredClone(graph);mutate(next);assert.notEqual(galaxyTopologyKey(galaxyData(graph)),galaxyTopologyKey(galaxyData(next)));
  }
});

test('目录样式原位更新 GPU 属性，保留几何体、坐标与入场状态', async () => {
  const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true},server:{middlewareMode:true,hmr:false,ws:false}});
  try {
    const {AggregateRenderer}=await server.ssrLoadModule('/src/galaxy/vendor/render/AggregateRenderer.ts');
    const {BufferGeometry,BufferAttribute,Color}=await import('three');
    const {documentAppearance}=await import('../src/document-state.ts');
    const renderer=Object.create(AggregateRenderer.prototype);
    const geometry=new BufferGeometry();
    const positions=new BufferAttribute(new Float32Array([1,2,3]),3);
    geometry.setAttribute('position',positions);
    geometry.setAttribute('aSize',new BufferAttribute(new Float32Array(1),1));
    renderer.sizes=new Float32Array(1);renderer.sizeMode='uniform';
    geometry.setAttribute('aCollectionColor',new BufferAttribute(new Float32Array(3),3));
    geometry.setAttribute('aCollectionShape',new BufferAttribute(new Float32Array(4),4));
    geometry.setAttribute('aRayAngle',new BufferAttribute(new Float32Array(1),1));
    renderer.nodeGeometry=geometry;renderer.data={nodes:[{collection:'notes',state:'pending'}],links:[]};
    const reveal={progress:.5};renderer.reveal=reveal;
    for(const state of ['pending','organized']) {
      renderer.data.nodes[0].state=state;renderer.updateNodeAppearance();
      const style=documentAppearance(renderer.data.nodes[0]),color=new Color(style.color);
      assert.ok(Math.abs(geometry.getAttribute('aCollectionColor').getX(0)-color.r)<1e-6);
      assert.ok(Math.abs(geometry.getAttribute('aCollectionShape').getX(0)-style.node.size)<1e-6);
      assert.equal(renderer.nodeGeometry,geometry);assert.equal(geometry.getAttribute('position'),positions);
      assert.deepEqual([...positions.array],[1,2,3]);assert.equal(renderer.reveal,reveal);
    }
    geometry.dispose();
  } finally {await server.close();}
});
