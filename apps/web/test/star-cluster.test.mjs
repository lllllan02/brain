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

test('按引用重排座位：采样点集合不变，引用线变短，结果稳定', () => {
  const ids = Array.from({length:200}, (_,i)=>`document-${i}`);
  const groups = new Map(ids.map((id,i)=>[id, `group-${i%5}`]));
  const links = ids.flatMap((id,i)=>[1,7].map(step=>({source:id, target:ids[(i+step*5)%ids.length]})));
  const plain = starCluster(ids, 100), arranged = starCluster(ids, 100, 1, {links, groups});
  const key = cloud => ids.map((_,i)=>cloud.slice(i*3,i*3+3).join(',')).sort();
  assert.deepEqual(key(arranged), key(plain));
  const total = cloud => { const at = new Map(ids.map((id,i)=>[id,cloud.slice(i*3,i*3+3)])); return links.reduce((sum,l)=>sum+Math.hypot(...at.get(l.source).map((v,a)=>v-at.get(l.target)[a])),0); };
  assert.ok(total(arranged) < total(plain) * .6);
  assert.deepEqual(starCluster([...ids].reverse(), 100, 1, {links, groups}).slice(-3), arranged.slice(0,3));
});
