import test from 'node:test';
import assert from 'node:assert/strict';
import {categoryLayout, interpolateCategories, readingNeighborhood} from '../src/galaxy/categoryLayout.js';
import {categoryStyle} from '../src/galaxy/categoryStyles.js';
import {starCluster} from '../src/galaxy/starCluster.js';

test('首页分组保留同一球体的所有空间采样，三轴都有厚度且语义区域聚拢', () => {
  const nodes = Array.from({length:180}, (_,i) => ({id:`n-${i}`, folderTop:`topic-${i % 8}`,collection:['inbox','notes','readings'][i % 3]}));
  const source = starCluster(nodes.map(n=>n.id), 180);
  for (const grouping of ['category','collection']) {
    const result = categoryLayout({nodes}, source, {preset:'deepfield',grouping});
    assert.equal(result.spherical,true);
    const coordinates = (positions, scale) => nodes.map((_,i) => [...positions.slice(i*3,i*3+3)].map(v => Math.fround(v*scale).toFixed(3)).join(',')).sort();
    assert.deepEqual(coordinates(result.positions,1),coordinates(source,1.12));
    assert.equal(new Set(result.groups.flatMap(g=>g.members)).size,nodes.length);
    for (let axis=0;axis<3;axis++) {
      const values = nodes.map((_,i)=>result.positions[i*3+axis]);
      assert.ok(Math.max(...values)-Math.min(...values)>200);
    }
    for (const group of result.groups) {
      const coherence = positions => {
        const sum = [0,0,0];
        for (const i of group.members) {
          const p = positions.slice(i*3,i*3+3), r = Math.hypot(...p) || 1;
          p.forEach((v,a)=>{sum[a]+=v/r;});
        }
        return Math.hypot(...sum)/group.members.length;
      };
      assert.ok(coherence(result.positions)>coherence(source));
    }
  }
});

test('球形展开沿圆弧运动，对向星点不穿过中心，途中反向保持连续', () => {
  const from = new Float32Array([100,0,0,0,50,0,0,0,0]);
  const to = new Float32Array([-112,0,0,0,-56,0,0,0,12]);
  const output = new Float32Array(from.length), motion = {spherical:true};
  assert.deepEqual(interpolateCategories(from,to,0,true,output,motion),from);
  assert.deepEqual(interpolateCategories(from,to,1,true,output,motion),to);
  for (let i=1;i<20;i++) {
    const mid = new Float32Array(interpolateCategories(from,to,i/20,true,output,motion));
    assert.ok([...mid].every(Number.isFinite));
    assert.ok(Math.hypot(...mid.slice(0,3))>=100);
    assert.ok(Math.hypot(...mid.slice(3,6))>=50);
    assert.deepEqual(interpolateCategories(mid,from,0,false,output,motion),mid);
  }
});

test('阅读邻域限制数量、排除其他分组并按实际节点范围取景', () => {
  const data = {nodes:Array.from({length:40}, (_,i) => ({folderTop:i<25?'a':'b', collection:i%2?'notes':'inbox'})), links:[{source:0,target:14}]};
  const positions = new Float32Array(data.nodes.flatMap((_,i) => [i * 5, 0, 0]));
  for (const grouping of ['category','collection']) {
    const result = readingNeighborhood(data, positions, 0, grouping);
    assert.equal(result.indices.size,13);
    assert.ok(result.indices.has(0));
    assert.ok(result.indices.has(14));
    const key = grouping === 'category' ? 'folderTop' : 'collection';
    for (const index of result.indices) {
      assert.equal(data.nodes[index][key],data.nodes[0][key]);
      assert.ok(index * 5 <= result.radius);
    }
  }
  assert.equal(readingNeighborhood(data,positions,-1,'category'),null);
  assert.deepEqual(readingNeighborhood({nodes:[{folderTop:'a'}],links:[]},new Float32Array(3),0,'category'),{indices:new Set([0]),radius:28});
});

test('同一分类从平面逐级增加厚度，深空背景弱于主体', () => {
  const data = {nodes:Array.from({length:40},(_,i)=>({id:`note-${i}`,folderTop:'one'}))};
  const source = new Float32Array(data.nodes.flatMap((_,i)=>[Math.sin(i)*50,Math.cos(i)*30,i]));
  const layouts = ['galaxy','nebula','deepfield'].map(preset=>categoryLayout(data,source,{preset}));
  const depth = layout => data.nodes.reduce((sum,_,i)=>{
    const p=layout.positions.slice(i*3,i*3+3);
    return sum + Math.abs(p[0]*layout.normal.x+p[1]*layout.normal.y+p[2]*layout.normal.z);
  },0);
  assert.ok(depth(layouts[0]) < depth(layouts[2]) * .1);
  assert.notDeepEqual(layouts[0].positions,layouts[1].positions);
  assert.notDeepEqual(layouts[1].positions,layouts[2].positions);
  assert.ok(depth(layouts[0]) < depth(layouts[1]));
  assert.ok(depth(layouts[1]) < depth(layouts[2]));
  assert.ok(categoryStyle('deepfield').starfield < categoryStyle('galaxy').starfield);
  assert.ok(categoryStyle('deepfield').nodeScale > categoryStyle('galaxy').nodeScale);
});

test('分类星云不丢失文档，阅读布局边界独立，兼容空库与单分类', () => {
  for (const count of [0, 1, 4, 35]) for (const aspect of [.46, 1.78]) for (const preset of ['galaxy','nebula','deepfield']) {
    const nodes = [], original = [];
    for (let g = 0; g < count; g++) for (let i = 0; i <= g % 7; i++) {
      nodes.push({id:`${g}-${i}`,folderTop:`category-${g}`});
      original.push(Math.sin(i+g)*100, Math.cos(i-g)*80, i*10);
    }
    const source = new Float32Array(original), backup = new Float32Array(source);
    const result = categoryLayout({nodes}, source, {aspect,preset});
    assert.equal(result.groups.length,count);
    assert.deepEqual(result.groups.flatMap(g=>g.members).sort((a,b)=>a-b),nodes.map((_,i)=>i));
    assert.ok([...result.positions].every(Number.isFinite));
    assert.deepEqual(source,backup);
    for (const group of result.groups) {
      for (const i of group.members) assert.ok(Math.hypot(...group.center.map((v,a)=>result.positions[i*3+a]-v))<=group.radius+.001);
      if (!result.spherical) for (const other of result.groups) if (other!==group) assert.ok(Math.hypot(...group.center.map((v,a)=>v-other.center[a]))>group.radius+other.radius);
    }
  }
});

test('展开和收回保持起止位置准确，途中反向切换不跳帧', () => {
  const start=new Float32Array([12,-30,5,70,19,-25]),end=new Float32Array([250,60,10,-190,-20,35]);
  const out=new Float32Array(start.length);
  for (const expanding of [true,false]) {
    assert.deepEqual(interpolateCategories(start,end,0,expanding,out),start);
    assert.deepEqual(interpolateCategories(start,end,1,expanding,out),end);
    for(const t of [.1,.18,.3,.7,.98]) {
      const current=new Float32Array(interpolateCategories(start,end,t,expanding,out));
      assert.ok([...current].every(Number.isFinite));
      assert.deepEqual(interpolateCategories(current,start,0,!expanding,out),current);
    }
  }
});

test('分组中心保持可读的平面排列，不受引用数量或输入顺序牵引', () => {
  const nodes = Array.from({length:24}, (_,i)=>({id:`n${i}`,folderTop:`c${i}`}));
  const links = nodes.slice(1).map((_,i)=>({source:0,target:i+1}));
  const source = new Float32Array(nodes.length * 3);
  const layouts = ['galaxy','nebula'].map(preset => {
    const base = categoryLayout({nodes,links:[]}, source, {preset});
    assert.deepEqual(categoryLayout({nodes,links}, source, {preset}).positions, base.positions);
    assert.deepEqual(categoryLayout({nodes:[...nodes].reverse()}, source, {preset}).groups.map(g=>g.center), base.groups.map(g=>g.center));
    return base;
  });
  const projected = layout => layout.groups.map(g=>({
    x:g.center.reduce((sum,v,i)=>sum+v*layout.right.getComponent(i),0),
    y:g.center.reduce((sum,v,i)=>sum+v*layout.up.getComponent(i),0),
    z:g.center.reduce((sum,v,i)=>sum+v*layout.normal.getComponent(i),0),
  }));
  for (const layout of layouts) assert.ok(projected(layout).every(p=>Math.abs(p.z)<1e-8));
  assert.deepEqual(layouts[0].groups.map(g=>g.center), layouts[1].groups.map(g=>g.center));
});

test('错峰动画保留原位和终点，快速反向切换仍连续', () => {
  const from=new Float32Array([12,4,5,-7,2,18]),to=new Float32Array([200,40,0,-150,-10,80]);
  const motion={delays:new Float32Array([0,.12]),tangents:new Float32Array([10,20,0,-10,-20,0])};
  const out=new Float32Array(from.length);
  assert.deepEqual(interpolateCategories(from,to,0,true,out,motion),from);
  assert.deepEqual(interpolateCategories(from,to,1,true,out,motion),to);
  const mid=new Float32Array(interpolateCategories(from,to,.07,true,out,motion));
  assert.deepEqual(mid.slice(3),from.slice(3));
  assert.notDeepEqual(mid.slice(0,3),from.slice(0,3));
  assert.deepEqual(interpolateCategories(mid,from,0,false,out,motion),mid);
});

// Directory grouping must cross topic boundaries without changing real links.
test('目录布局覆盖三个目录，目录聚焦只突出所属文档及内部引用', async () => {
  const {galaxyFocus} = await import('../src/galaxy/data.js');
  const nodes = [
    {id:'a', folderTop:'topic-a', collection:'inbox'},
    {id:'b', folderTop:'topic-b', collection:'inbox'},
    {id:'c', folderTop:'topic-a', collection:'notes'},
    {id:'d', folderTop:'topic-b', collection:'readings'},
  ];
  const data = {nodes, links:[{source:0,target:1},{source:0,target:2}]};
  const original = structuredClone(data);
  for (const preset of ['galaxy', 'nebula', 'deepfield']) {
    const layout = categoryLayout(data, new Float32Array(12), {preset, grouping:'collection'});
    assert.deepEqual(layout.groups.map(g=>[g.id,g.members]), [
      ['collection:inbox',[0,1]], ['collection:notes',[2]], ['collection:readings',[3]],
    ]);
    assert.ok([...layout.positions].every(Number.isFinite));
  }
  const focus = galaxyFocus(data, null, 'collection:inbox');
  assert.deepEqual([...focus.bright], [0,1]);
  assert.deepEqual(focus.links, [0]);
  assert.deepEqual([...galaxyFocus(data, null, 'topic-a').bright], [0,2]);
  assert.deepEqual(data, original);
});
