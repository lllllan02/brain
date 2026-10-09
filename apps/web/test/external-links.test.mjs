import test from 'node:test';
import assert from 'node:assert/strict';
import {externalLink} from '../src/neural/external-links.js';

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
