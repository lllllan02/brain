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
  assert.deepEqual(await api.updateDocumentState('note', 'organized', 'v1'), library);
  assert.deepEqual(requests[1], ['/api/documents/state', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'note', state: 'organized', version: 'v1' }),
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
  await assert.rejects(api.updateDocumentState('broken','organized','v1'),/文档数据格式无效/);
});

test('未变化的轮询复用对象；写回后沿用新版本校验，不再下载整库', async t => {
  let calls = 0, parsed = 0;
  const api = await client(t, { fetch: async (_url, options) => {
    calls++;
    if (calls === 2) {
      assert.equal(options.headers['If-None-Match'], '"v1"');
      assert.equal(options.cache, 'no-store');
      return { status: 304, json: () => { throw Error('不得解析 304'); } };
    }
    if (calls === 4) {
      assert.equal(options.headers['If-None-Match'], '"v2"');
      return { status: 304, json: () => { throw Error('不得重新下载整库'); } };
    }
    return { ok: true, headers: new Headers({ ETag: calls < 3 ? '"v1"' : '"v2"' }), json: async () => {
      parsed++;
      return { documents: [], version: calls < 3 ? 'v1' : 'v2' };
    } };
  } });
  const first = await api.fetchLibrary();
  assert.equal(await api.fetchLibrary(), first);
  assert.equal(parsed, 1);
  await api.updateDocumentState('note', 'organized', 'v1');
  assert.equal((await api.fetchLibrary()).version, 'v2');
  assert.equal(parsed, 2);
});

test('增量状态响应保留无关对象，校验版本与未知目标后才合并',async t=>{
  const {parseDocument,renderDocument}=await import('../src/library.ts');
  const raw=parseDocument('正文','notes/a.md'),other=parseDocument('其他正文','notes/other.md');
  const initial={version:'v1',documents:[renderDocument(raw,[raw,other]),renderDocument(other,[raw,other])]};
  const changed={...initial.documents[0],state:'reading'};
  let calls=0,body;
  const api=await client(t,{fetch:async(_url,options)=>{
    calls++;
    if(calls===1)return {ok:true,json:async()=>initial};
    body=JSON.parse(options.body);
    return {ok:true,json:async()=>({kind:'state-update',baseVersion:calls===2?'v1':calls===3?'wrong':'v2',version:'v2',documents:[calls===4?{...changed,id:'unknown'}:changed]})};
  }});
  const before=await api.fetchLibrary();
  const next=await api.updateDocumentState('a','reading','v1');
  assert.equal(body.incremental,true);
  assert.equal(next.documents[1],before.documents[1]);
  assert.equal(next.documents[0].state,'reading');
  await assert.rejects(api.updateDocumentState('a','organized','v2'),/版本不匹配/);
  await assert.rejects(api.updateDocumentState('a','organized','v2'),/未知文档/);
});
