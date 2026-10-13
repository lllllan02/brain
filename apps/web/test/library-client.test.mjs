import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

async function client(t, { pages = false, hostname = '127.0.0.1', fetch }) {
  const originals = ['location', 'fetch'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
  t.after(() => {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  Object.defineProperty(globalThis, 'location', { configurable: true, value: { protocol: 'http:', hostname } });
  globalThis.fetch = fetch;
  const result = await build({
    entryPoints: [fileURLToPath(new URL('../src/data/library-client.ts', import.meta.url))],
    bundle: true, write: false, format: 'esm', platform: 'browser',
    define: { __STATIC_PAGES__: String(pages), 'import.meta.env.BASE_URL': '"/horizon/"' },
  });
  const code = result.outputFiles[0].text;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}#${Math.random()}`);
}

test('本地文档请求保留接口、状态写回参数与服务端错误', async t => {
  const requests = [];
  const library = { documents: [], version: 'v2' };
  const api = await client(t, { fetch: async (...args) => {
    requests.push(args);
    return requests.length < 3
      ? { ok: true, json: async () => library }
      : { ok: false, json: async () => ({ error: '文件已修改' }) };
  } });
  assert.equal(api.localEditing, true);
  const controller = new AbortController();
  assert.deepEqual(await api.fetchLibrary(controller.signal), library);
  assert.equal(requests[0][1].signal, controller.signal);
  assert.equal(requests[0][0], '/api/library');
  assert.deepEqual(await api.updateDocumentState('note', 'understood', 'v1'), library);
  assert.deepEqual(requests[1], ['/api/documents/state', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'note', state: 'understood', version: 'v1' }),
  }]);
  await assert.rejects(api.updateDocumentState('note', 'pending', 'v1'), /文件已修改/);
});

test('Pages 在本机预览也保持只读，静态地址包含部署前缀', async t => {
  let url;
  const api = await client(t, { pages: true, fetch: async target => {
    url = target;
    return { ok: true, json: async () => ({ documents: [], version: 'v1' }) };
  } });
  assert.equal(api.localEditing, false);
  await api.fetchLibrary();
  assert.equal(url, '/horizon/library.json');
});

test('远程地址不启用状态写回，读取失败保留错误提示', async t => {
  const api = await client(t, { hostname: 'example.com', fetch: async () => ({ ok: false }) });
  assert.equal(api.localEditing, false);
  await assert.rejects(api.fetchLibrary(), /无法读取文档/);
});


test('读取与状态写回均拒绝不符合文档契约的成功响应', async t => {
  const api = await client(t, {fetch:async()=>({ok:true,json:async()=>({version:'v1',documents:[{id:'broken'}]})})});
  await assert.rejects(api.fetchLibrary(),/文档数据格式无效/);
  await assert.rejects(api.updateDocumentState('broken','understood','v1'),/文档数据格式无效/);
});
