import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createReaderFrontend } from '../src/reader-frontend.ts';
import { readerBuildKey } from '../src/reader-build-cache.ts';

test('稳定阅读缓存复用、失效、强制重建与损坏恢复', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'horizon-cache-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(path.join(root, 'vite.config.ts'), 'export default {}');
  await writeFile(path.join(root, 'index.html'), '<script type="module" src="/main.js"></script>');
  await writeFile(path.join(root, 'main.js'), 'console.log("first");');
  const start = async (rebuild = false) => {
    const reader = await createReaderFrontend(root, { rebuild });
    const hit = reader.cacheHit;
    await reader.close();
    return hit;
  };
  assert.equal(await start(), false);
  assert.equal(await start(), true);
  await mkdir(path.join(root, 'content'));
  await writeFile(path.join(root, 'content/note.md'), '# New note');
  assert.equal(await start(), true, '笔记不使前端缓存失效');
  assert.equal(await start(true), false);
  assert.equal(await start(), true);
  await writeFile(path.join(root, 'main.js'), 'console.log("other");');
  assert.equal(await start(), false, '同长度源码修改也要重建');
  await mkdir(path.join(root, 'public'));
  await writeFile(path.join(root, 'public/example.txt'), 'asset');
  assert.equal(await start(), false);
  await rm(path.join(root, 'public/example.txt'));
  assert.equal(await start(), false, '删除素材也要重建');
  const key = await readerBuildKey(root);
  const cached = path.join(root, 'node_modules/.cache/horizon-reader', key, 'frontend');
  const assets = await readdir(path.join(cached, 'assets'));
  await writeFile(path.join(cached, 'assets', assets[0]!), 'damaged');
  assert.equal(await start(), false, '损坏资源不能被复用');
  assert.equal(await start(), true, '损坏缓存应被修复');
  await writeFile(path.join(root, 'vite.config.ts'), 'export default {define:{EXAMPLE:"true"}}');
  assert.equal(await start(), false);
});

test('构建键覆盖配置、依赖与新增文件', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'horizon-key-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  let previous = await readerBuildKey(root);
  for (const file of [
    'src/app.ts',
    'package-lock.json',
    'node_modules/.package-lock.json',
    '.env.production',
    'tsconfig.json',
  ]) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), 'changed');
    const next = await readerBuildKey(root);
    assert.notEqual(next, previous, file);
    previous = next;
  }
});
