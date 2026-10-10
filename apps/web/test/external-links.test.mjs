import test from 'node:test';
import assert from 'node:assert/strict';
import {collectExternalLinks, externalLink} from '../src/neural/external-links.js';

const anchor = (href, textContent = '') => ({getAttribute: () => href, textContent});

test('底部来源合并章节与文本锚点，保留来源顺序并优先使用文章标题', () => {
  const anchors = [
    anchor('https://example.org/article#intro', '简介'),
    anchor('https://other.example/post', '另一篇 ↗'),
    anchor('https://example.org/article#:~:text=Tools', '工具设计'),
    anchor('https://example.org/article', '原文标题'),
    anchor('https://example.org/article#evaluation', '评测'),
  ];
  assert.deepEqual(collectExternalLinks(anchors), [
    {href: 'https://example.org/article', title: '原文标题'},
    {href: 'https://other.example/post', title: '另一篇'},
  ]);
  assert.equal(anchors[0].getAttribute('href'), 'https://example.org/article#intro');
});

test('不同文章、查询参数及 hash 路由不误合并，空标题使用地址', () => {
  const hrefs = [
    'https://example.org/article?id=1', 'https://example.org/article?id=2',
    'https://example.org/other', 'https://example.org/#/one',
    'https://example.org/#/two', 'https://example.org/#!/one',
  ];
  assert.deepEqual(collectExternalLinks(hrefs.map(href => anchor(href))), hrefs.map(href => ({href, title: href})));
});

test('底部来源保留邮件并去重，排除内部链接、附件与非支持协议', () => {
  const hrefs = ['mailto:a@b.com', 'mailto:a@b.com', '#/doc/test', '/api/asset?path=test', 'javascript:alert(1)', 'data:text/plain,test', 'invalid'];
  assert.deepEqual(collectExternalLinks(hrefs.map(href => anchor(href))), [{href: 'mailto:a@b.com', title: 'mailto:a@b.com'}]);
});

test('任意网页来源均动态使用实际源站图标，无网站白名单', () => {
  for (const origin of ['https://go.dev', 'https://pkg.go.dev', 'https://new-site.example', 'https://docs.example:8443', 'http://127.0.0.1:8080']) {
    assert.equal(externalLink(`${origin}/article?q=test#section`).iconUrl, `${origin}/favicon.ico`);
  }
  assert.equal(externalLink('https://github.com.example.org/article').iconUrl, 'https://github.com.example.org/favicon.ico');
});
test('图标请求不携带文章路径、查询、锚点或 URL 凭据', () => {
  const link = externalLink('https://user:password@docs.example/private/article?token=secret#section');
  assert.equal(link.iconUrl, 'https://docs.example/favicon.ico');
  assert.equal(link.host, 'docs.example');
});
test('完整地址保留路径、查询和锚点，内部链接、邮箱及非网页协议不处理', () => {
  const href = 'https://go.dev/doc/?q=a%26b&lang=zh#section';
  assert.equal(externalLink(href).href, href);
  for (const href of ['#/doc/test', '/api/asset?path=test', 'mailto:a@b.com', 'javascript:alert(1)', 'data:text/plain,test', 'invalid']) assert.equal(externalLink(href), null);
});
