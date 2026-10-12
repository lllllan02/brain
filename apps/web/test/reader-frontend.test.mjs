import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createReaderFrontend } from '../src/reader-frontend.ts';

test('阅读进程使用独立构建，源码和另一次构建不能替换正在提供的脚本', async t => {
  const root=await mkdtemp(path.join(os.tmpdir(),'horizon-frontend-test-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  await writeFile(path.join(root,'vite.config.ts'),'export default {}');
  await writeFile(path.join(root,'index.html'),'<div id="root"></div><script type="module" src="/main.js"></script>');
  await writeFile(path.join(root,'main.js'),'document.querySelector("#root").textContent="first build";');
  const reader=await createReaderFrontend(root);t.after(()=>reader.close());
  const server=http.createServer((req,res)=>{void reader.handle(req,res).catch(()=>{res.writeHead(500);res.end();});});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
  const url=`http://127.0.0.1:${server.address().port}`;
  const html=await (await fetch(url)).text();
  assert.doesNotMatch(html,/@vite\/client/);
  const asset=html.match(/src="([^" ]+\.js)"/)[1];
  const before=await (await fetch(url+asset)).text();assert.match(before,/first build/);
  await writeFile(path.join(root,'main.js'),'document.querySelector("#root").textContent="second build";');
  const next=await createReaderFrontend(root);await next.close();
  assert.equal(await (await fetch(url+asset)).text(),before);
  assert.equal((await fetch(url+'/main.js')).status,404);
  assert.equal((await fetch(url+asset,{method:'HEAD'})).status,200);
});
