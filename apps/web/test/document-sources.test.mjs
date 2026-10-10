import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDocument} from '../src/library.mjs';
import {documentSources, copyDocumentMarkdown} from '../src/neural/document-sources.js';
import {createServer} from 'vite';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

test('来源合并 source、url、URL，保留标签、锚点、出处文本并去重', () => {
  const doc = parseDocument('---\nsource:\n  - "[原文](https://example.com/a#part)，作者"\n  - "纸质书"\nurl: https://example.com/a#part\nURL: https://example.org/b\n---\n正文', 'readings/test.md');
  assert.deepEqual(documentSources(doc.sources), [
    {title:'原文，作者',href:'https://example.com/a#part'},
    {title:'纸质书',href:null},
    {title:'https://example.org/b',href:'https://example.org/b'},
  ]);
  assert.equal(doc.body, '正文');
  assert.match(copyDocumentMarkdown(doc), /\[原文，作者\]\(https:\/\/example.com\/a#part\)/);
  assert.equal(copyDocumentMarkdown({title:'无来源',body:'正文'}), '# 无来源\n\n正文');
});

test('来源组件隐藏空值，转义标题，只为 HTTP(S) 提供外链', async () => {
  const server = await createServer({root:new URL('..',import.meta.url).pathname,configFile:false,server:{middlewareMode:true},appType:'custom'});
  try {
    const {ReaderSources} = await server.ssrLoadModule('/src/neural/ReaderSources.jsx');
    const render = sources => renderToStaticMarkup(React.createElement(ReaderSources,{sources}));
    assert.equal(render([]), '');
    const html = render(['[<script>alert(1)</script>](https://example.org/)', '[危险](javascript:alert(1))', 'data:text/html,test']);
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /rel="noopener noreferrer"/);
    assert.equal((html.match(/<a /g)||[]).length, 1);
    assert.doesNotMatch(html, /href="(?:javascript|data):/);
  } finally {await server.close();}
});
