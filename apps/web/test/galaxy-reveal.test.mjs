import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';

test('入场从阅读中心展开，单调到达原坐标，重放不修改目标', async () => {
  const server = await createServer({configFile:false, optimizeDeps:{noDiscovery:true}, server:{middlewareMode:true,hmr:false,ws:false}});
  try {
    const {fillRevealPositions, maxPositionRadius} = await server.ssrLoadModule('/src/galaxy/vendor/render/reveal.ts');
    const origin = {x:80, y:-20, z:40};
    const target = new Float32Array([80,-20,40, 180,40,-30, -120,90,130]);
    const copy = target.slice(), out = new Float32Array(target.length);
    const radius = maxPositionRadius(target,3,origin);
    for (let replay = 0; replay < 2; replay++) {
      const previous = [0,0,0];
      for (let step = 0; step <= 100; step++) {
        fillRevealPositions(out,target,3,radius,step / 100,origin);
        for (let i=0; i<3; i++) {
          const distance = Math.hypot(out[i*3]-origin.x,out[i*3+1]-origin.y,out[i*3+2]-origin.z);
          assert.ok(distance + 1e-4 >= previous[i]);
          previous[i] = distance;
          if (!step) assert.deepEqual([...out.slice(i*3,i*3+3)],Object.values(origin));
        }
      }
      assert.deepEqual(out,target);
      assert.deepEqual(target,copy);
    }
    fillRevealPositions(out,target,3,radius,1,origin);
    assert.deepEqual(out,target); // Reduced motion / interrupted reveal lands exactly.
    assert.equal(maxPositionRadius(new Float32Array(),0,origin),1);
    fillRevealPositions(new Float32Array(),new Float32Array(),0,1,0,origin);
  } finally { await server.close(); }
});

test('星点未就绪时列表不可见且不提前挂载连线，就绪后保留文档入口', async () => {
  const server = await createServer({configFile:false, optimizeDeps:{noDiscovery:true}, server:{middlewareMode:true,hmr:false,ws:false}});
  try {
    const {default: React} = await import('react');
    const {renderToStaticMarkup} = await import('react-dom/server');
    const {ClusterList} = await server.ssrLoadModule('/src/neural/ClusterList.jsx');
    const source = {id:'a',title:'起点',module:'topic',references:[{id:'b'}]};
    const target = {id:'b',title:'目标文章',module:'topic',collection:'inbox'};
    const graph = {nodes:[source,target],index:new Map([['a',source],['b',target]]),modules:[]};
    const props = {graph, cluster:{document:'a'},selected:'a',onPresenceChange:()=>{},reduced:false};
    const waiting = renderToStaticMarkup(React.createElement(ClusterList,{...props,active:false}));
    assert.match(waiting,/visibility:hidden/);
    assert.match(waiting,/inert=""/);
    assert.ok(!waiting.includes('目标文章'));
    assert.ok(!waiting.includes('<svg'));
    const ready = renderToStaticMarkup(React.createElement(ClusterList,{...props,active:true}));
    assert.ok(ready.includes('目标文章'));
    assert.ok(ready.includes('cluster-thread'));
    assert.ok(!ready.includes('visibility:hidden'));
  } finally { await server.close(); }
});
