import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {galaxyData, galaxyFocus} from '../src/galaxy/data.js';

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
