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
