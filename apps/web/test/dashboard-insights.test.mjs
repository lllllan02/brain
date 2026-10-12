import test from 'node:test';
import assert from 'node:assert/strict';
import {dashboardInsights} from '../src/neural/dashboard-insights.js';

test('专题保留跨专题入站引用，排除重复、自引用与缺失目标',()=>{
 const docs=[{id:'a',title:'A',category:'甲',collection:'readings',references:[{id:'a'},{id:'missing'}],sources:[]},{id:'b',title:'B',category:'乙',collection:'notes',references:[{id:'a'},{id:'a'}]},{id:'c',title:'C',category:'甲',collection:'inbox',references:[]}];
 const result=dashboardInsights(docs,'甲');
 assert.equal(result.scoped.length,2);
 assert.equal(result.incoming.get('a').size,1);
 assert.deepEqual(result.citedReadings.map(d=>d.id),['a']);
 assert.deepEqual(result.isolated.map(d=>d.id),['c']);
 assert.equal(result.connected.length,1);
});
test('域名按导读去重，多来源独立统计；忽略非网址与其他目录来源',()=>{
 const docs=[{id:'a',title:'A',collection:'readings',sources:['[文章](https://www.example.com/a)','https://example.com/b','https://other.test/x','mailto:a@example.com','普通文字']},{id:'b',title:'B',collection:'readings',sources:['https://example.com/c']},{id:'c',title:'C',collection:'notes',sources:['https://ignored.test']}];
 const result=dashboardInsights(docs);
 assert.equal(result.withSource,2);
 assert.deepEqual(result.domains.map(d=>[d.host,d.docs.length]),[['example.com',2],['other.test',1]]);
 assert.equal(result.citedReadings.length,0);
});
test('空库和未分类可独立筛选',()=>{
 assert.equal(dashboardInsights([]).scoped.length,0);
 const result=dashboardInsights([{id:'a',title:'A'},{id:'b',title:'B',category:'甲'}],'');
 assert.deepEqual(result.scoped.map(d=>d.id),['a']);
 assert.deepEqual(result.categories,['','甲']);
});
