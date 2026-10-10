import test from 'node:test';
import assert from 'node:assert/strict';
import {starCluster} from '../src/galaxy/starCluster.js';

test('星团在球体内部聚拢，三轴均衡且无重叠，输入顺序不改变文档位置', () => {
  const ids = Array.from({length:300}, (_,i)=>`document-${i}`);
  const cloud = starCluster(ids, 100);
  const radii = ids.map((_,i)=>Math.hypot(...cloud.slice(i*3,i*3+3)));
  assert.ok(radii.every(r=>r<=100));
  assert.ok(radii.filter(r=>r<50).length>75); // Uniform volume would put only 1/8 inside.
  const variance = [0,1,2].map(a=>ids.reduce((sum,_,i)=>sum+cloud[i*3+a]**2,0));
  assert.ok(Math.min(...variance)/Math.max(...variance)>.75);
  assert.equal(new Set(ids.map((_,i)=>cloud.slice(i*3,i*3+3).join(','))).size, ids.length);
  const reversed = starCluster([...ids].reverse(),100);
  ids.forEach((_,i)=>assert.deepEqual(cloud.slice(i*3,i*3+3),reversed.slice((ids.length-1-i)*3,(ids.length-i)*3)));
  assert.deepEqual(starCluster([],100),new Float32Array());
  assert.deepEqual(starCluster(['only'],100),new Float32Array([0,0,0]));
});
