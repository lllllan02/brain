import test from 'node:test';
import assert from 'node:assert/strict';
import {categoryLayout, interpolateCategories} from '../src/galaxy/categoryLayout.js';
import {categoryStyle} from '../src/galaxy/categoryStyles.js';

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

test('分类星云不丢失文档，分类边界互不重叠，兼容空库与单分类', () => {
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
      for (const other of result.groups) if (other!==group) assert.ok(Math.hypot(...group.center.map((v,a)=>v-other.center[a]))>group.radius+other.radius);
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

test('分类排列由视图维度决定，不受引用数量或输入顺序牵引', () => {
  const nodes = Array.from({length:24}, (_,i)=>({id:`n${i}`,folderTop:`c${i}`}));
  const links = nodes.slice(1).map((_,i)=>({source:0,target:i+1}));
  const source = new Float32Array(nodes.length * 3);
  const layouts = ['galaxy','nebula','deepfield'].map(preset => {
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
  const [disk, shell, sphere] = layouts.map(projected);
  assert.ok(disk.every(p=>Math.abs(p.z)<1e-8));
  const range = points => Math.max(...points.map(p=>p.z))-Math.min(...points.map(p=>p.z));
  assert.ok(range(shell)>10 && range(shell)<range(sphere));
  // A sphere has comparable extents on all axes, unlike a flattened disk.
  const spans = ['x','y','z'].map(axis=>Math.max(...sphere.map(p=>p[axis]))-Math.min(...sphere.map(p=>p[axis])));
  assert.ok(Math.min(...spans) / Math.max(...spans) > .85);
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
