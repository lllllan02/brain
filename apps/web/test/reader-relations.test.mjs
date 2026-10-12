import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReaderRelations } from '../src/neural/ReaderRelations.tsx';
import { buildGraph } from '../src/neural/graph.ts';

test('当前文档删除后，退出中的阅读面板允许分类已经消失', () => {
  const graph=buildGraph({version:'empty',documents:[]});
  const html=renderToStaticMarkup(createElement(ReaderRelations,{
    graph,node:{id:'removed',category:'旧分类',tags:[]},module:null,cluster:null,
    onChoose:()=>{},section:'context',
  }));
  assert.match(html,/旧分类/);assert.match(html,/disabled=""/);
});
