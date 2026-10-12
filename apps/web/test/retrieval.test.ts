import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { runCLI, buildLibrary, parseOptions } from '../../../scripts/retrieve.ts';
import { renderDocument, parseDocument, attachBacklinks } from '../src/library.ts';

const repository = fileURLToPath(new URL('../../../', import.meta.url));
const entry = path.join(repository, 'scripts/retrieve.ts');
const loader = import.meta.resolve('tsx');
async function fixture(t: TestContext) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'horizon-retrieval-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'content/notes'), { recursive: true });
  const put = (name: string, text: string) =>
    writeFile(path.join(root, 'content/notes', name), text);
  await put(
    'alpha.md',
    '---\ntitle: 起点\naliases: [入口]\ncategory: 检索\ntags: [测试]\n---\n## 二级标题\n检索正文 [[beta]] [[beta]]\n```js\nconst value = 1;\n```',
  );
  await put('beta.md', '---\ntitle: 终点\ncategory: 检索\n---\n返回 [[alpha]]');
  return { root, put };
}
async function run(root: string, ...args: string[]) {
  let stdout = '',
    stderr = '';
  const code = await runCLI(args, root, {
    write: (text) => {
      stdout += text;
    },
    log: (text) => {
      stdout += text + '\n';
    },
    error: (text) => {
      stderr += text + '\n';
    },
  });
  return { code, stdout, stderr };
}

test('四个检索命令保持输出契约、排序、片段和退出码', async (t) => {
  const { root } = await fixture(t);
  const index = await run(root, 'index');
  assert.equal(index.code, 0);
  const entries = index.stdout
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  assert.deepEqual(
    entries.map((doc) => doc.id),
    ['alpha', 'beta'],
  );
  assert.deepEqual(entries[0].headings, ['二级标题']);
  assert.deepEqual(entries[1].backlinks, ['alpha']);
  const query = await run(root, 'query', '入口', '--json');
  const results = JSON.parse(query.stdout).results;
  assert.deepEqual(
    results.map((row: { id: string }) => row.id),
    ['alpha'],
  );
  assert.ok(results[0].fields.includes('别名'));
  assert.equal(
    JSON.parse((await run(root, 'query', '检索', '--limit', '1', '--json')).stdout).results.length,
    1,
  );
  assert.match((await run(root, 'query', '检索正文')).stdout, /L2  检索正文/);
  assert.match((await run(root, 'links', 'alpha')).stdout, /入链 1:\n  ← beta/);
  assert.equal((await run(root, 'links', 'missing')).code, 1);
  assert.equal((await run(root, 'lint', '--json')).code, 0);
});

test('无效参数在扫描前失败，双横线后允许检索选项形状的文字', async () => {
  for (const args of [
    [],
    ['bad'],
    ['query'],
    ['links'],
    ['query', 'x', '--limit'],
    ['query', 'x', '--limit', '-1'],
    ['query', 'x', '--limit', '1.5'],
    ['query', 'x', '--dirs', ','],
    ['query', 'x', '--unknown'],
  ])
    assert.equal((await run('/nonexistent-root', ...args)).code, 2);
  assert.equal((await run('/nonexistent-root', '--help')).code, 0);
  assert.deepEqual(parseOptions(['--', '--json']).terms, ['--json']);
});

test('重叠目录只收录一次，同名文档按各自原文巡检，坏元数据不阻断其余文档', async (t) => {
  const { root, put } = await fixture(t);
  await mkdir(path.join(root, 'content/notes/nested'));
  await writeFile(path.join(root, 'content/notes/nested/alpha.md'), '重复正文，无元数据');
  await put('invalid.md', '---\ncategory: [invalid]\n---\n坏文档');
  const lib = await buildLibrary(root, ['content/notes', 'content/notes/nested']);
  assert.equal(lib.documents.length, 3);
  assert.deepEqual(lib.duplicates, ['alpha']);
  const lint = await run(root, 'lint', '--json');
  assert.equal(lint.code, 1);
  const findings = JSON.parse(lint.stdout).findings;
  assert.deepEqual(findings.frontmatter, ['content/notes/nested/alpha.md 缺少 frontmatter']);
  assert.equal(findings.parse.length, 1);
});

test('轻量渲染保留标题、引用、parent 和问题，反链去重并保留原始文档顺序', () => {
  const a = parseDocument(
    '---\nparent: b\n---\n## 标题\n[[b]] [[b]] [[missing]]\n```js\nconst x = 1;\n```',
    'notes/a.md',
  );
  const b = parseDocument('---\ntitle: B\n---\n[[a]]', 'notes/b.md');
  const full = renderDocument(a, [a, b]);
  const light = renderDocument(a, [a, b], { highlightCode: false });
  assert.notEqual(light.html, full.html);
  const { html: _full, ...fullMetadata } = full;
  const { html: _light, ...lightMetadata } = light;
  assert.deepEqual(lightMetadata, fullMetadata);
  const docs = attachBacklinks([full, renderDocument(b, [a, b])]);
  assert.deepEqual(
    docs.map((doc) => doc.backlinks),
    [['b'], ['a']],
  );
});

test('直接 TypeScript 入口可从任意工作目录启动；管道提前关闭安静退出', async (t) => {
  const { root, put } = await fixture(t);
  const call = (args: string[], closePipe = false) =>
    new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
      const child = spawn(process.execPath, ['--import', loader, entry, ...args], {
        cwd: os.tmpdir(),
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let stdout = '',
        stderr = '';
      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
        if (closePipe) child.stdout.destroy();
      });
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });
      child.on('error', reject);
      child.on('close', (code) => resolve({ code, stdout, stderr }));
    });
  assert.equal((await call(['--help'])).code, 0);
  const bad = await call(['query', 'x', '--limit', '0']);
  assert.equal(bad.code, 2);
  await put('large.md', `---\ntitle: ${'x'.repeat(300000)}\n---\nbody`);
  const piped = await call(
    ['index', '--dirs', path.relative(repository, path.join(root, 'content/notes'))],
    true,
  );
  assert.equal(piped.code, 0);
  assert.equal(piped.stderr, '');
});
