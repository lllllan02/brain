import { test, expect } from '@playwright/test';
import { mkdtemp, mkdir, writeFile, rm, unlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { startServer } from '../server.ts';

let app: Awaited<ReturnType<typeof startServer>>;
let root: string;
let url: string;
const body = (version: string) =>
  `---\ntitle: 稳定阅读\ncategory: 验收\n---\n# 稳定阅读\n${version}\n\n` +
  Array.from({ length: 60 }, (_, i) => `## 段落 ${i}\n连续阅读中的正文 ${i}。\n\n`).join('');

test.beforeAll(async () => {
  test.setTimeout(120000);
  root = await mkdtemp(path.join(os.tmpdir(), 'horizon-live-browser-'));
  await mkdir(path.join(root, 'inbox'));
  await mkdir(path.join(root, 'notes'));
  await writeFile(path.join(root, 'inbox/stable.md'), body('初始正文'));
  app = await startServer({ root, port: 0 });
  const address = app.server.address();
  if (!address || typeof address === 'string') throw Error('Missing test server');
  url = `http://127.0.0.1:${address.port}`;
});
test.afterAll(async () => {
  await app?.close();
  if (root) await rm(root, { recursive: true, force: true });
});

test('文档、元数据与图谱自动局部更新，保留阅读段落、图表和画布', async ({ page }, testInfo) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const diagram = '\n```mermaid\nflowchart LR\n A --> B\n```\n';
  await writeFile(path.join(root, 'inbox/stable.md'), body('初始正文') + diagram);
  await page.goto(url + '/#/doc/stable');
  const reader = page.locator('.document-reader');
  await expect(reader).toBeVisible();
  await expect(reader.locator('.diagram-canvas svg')).toHaveCount(1);
  await expect(page.locator('.reader-shell')).not.toHaveAttribute('inert');
  await expect(page.locator('.galaxy-viewport')).not.toHaveClass(/is-loading/);
  const canvas = await page.locator('.galaxy-viewport canvas').elementHandle();
  const svg = await reader.locator('.diagram-canvas svg').elementHandle();
  const paragraph = reader.locator('p').filter({ hasText: '连续阅读中的正文 10。' });
  const original = await paragraph.elementHandle();
  await paragraph.scrollIntoViewIfNeeded();
  await paragraph.evaluate((el) => {
    el.closest('.an-scroll')!.scrollTo({ top: 800, behavior: 'instant' });
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  });
  const scroller = reader.locator('.an-scroll');
  const scroll = await scroller.evaluate((el) => el.scrollTop);
  const paragraphY = await paragraph.evaluate((el) => el.getBoundingClientRect().top);
  const timeOrigin = await page.evaluate(() => performance.timeOrigin);
  await page.evaluate(() => {
    const viewport = document.querySelector('.galaxy-viewport')!;
    viewport.setAttribute('data-test-reentries', '0');
    new MutationObserver((records) => {
      if (
        records.some(
          (record) =>
            record.type === 'childList' ||
            (record.type === 'attributes' && viewport.classList.contains('is-loading')),
        )
      )
        viewport.setAttribute(
          'data-test-reentries',
          String(Number(viewport.getAttribute('data-test-reentries')) + 1),
        );
    }).observe(viewport, { childList: true, attributes: true, attributeFilter: ['class'] });
  });
  const unchanged = async () => {
    expect(
      await page.locator('.galaxy-viewport canvas').evaluate((el, old) => el === old, canvas),
    ).toBe(true);
    expect(await paragraph.evaluate((el, old) => el === old, original)).toBe(true);
    expect(await reader.locator('.diagram-canvas svg').evaluate((el, old) => el === old, svg)).toBe(
      true,
    );
    expect(await paragraph.evaluate((el) => el.getBoundingClientRect().top)).toBeCloseTo(
      paragraphY,
      0,
    );
    expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin);
    await expect(page.locator('.galaxy-viewport')).toHaveAttribute('data-test-reentries', '0');
  };
  const changedLibrary = (text: string) =>
    page.waitForResponse(
      async (response) =>
        response.url().endsWith('/api/library') &&
        response.status() === 200 &&
        (await response.text()).includes(text),
      { timeout: 20000 },
    );
  // Unrelated additions and edits do not replace the current article.
  let synced = changedLibrary('另一篇初稿');
  await writeFile(path.join(root, 'notes/new.md'), '---\ntitle: 另一篇\n---\n另一篇初稿');
  await synced;
  await expect(page.locator('.galaxy-label').filter({ hasText: '稳定阅读' })).toBeVisible();
  await unchanged();
  synced = changedLibrary('另一篇更新');
  await writeFile(path.join(root, 'notes/new.md'), '---\ntitle: 另一篇\n---\n另一篇更新');
  await synced;
  await unchanged();
  expect(await scroller.evaluate((el) => el.scrollTop)).toBe(scroll);
  // Only the changed paragraph is replaced; an insertion above the viewport preserves its anchor.
  await writeFile(
    path.join(root, 'inbox/stable.md'),
    body('最新正文\n\n新增的一段说明。') + diagram,
  );
  await expect(reader).toContainText('最新正文', { timeout: 20000 });
  await unchanged();
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe(
    '连续阅读中的正文 10。',
  );
  await page.screenshot({ path: testInfo.outputPath('local-update.png') });
  const updatedBody =
    body('最新正文\n\n新增的一段说明。')
      .replace('title: 稳定阅读', 'title: 新标题')
      .replace('category: 验收', 'category: 新分类') +
    diagram +
    '\n[[new|另一篇链接]]\n';
  await writeFile(path.join(root, 'inbox/stable.md'), updatedBody);
  await expect(reader.locator('.reader-toolbar')).toContainText('新标题', { timeout: 20000 });
  await unchanged();
  const moveScroll = await scroller.evaluate((el) => el.scrollTop);
  const toolbar = reader.locator('.reader-toolbar');
  for (const filtered of [false, true]) {
    if (filtered) await page.getByTitle('按目录展开星云', { exact: true }).click();
    for (const [action, reverse, collection] of [
      ['已理解，移入 Notes', '重新学习，移回 Inbox', 'notes'],
      ['重新学习，移回 Inbox', '已理解，移入 Notes', 'inbox'],
    ]) {
      await toolbar.getByRole('button', { name: action }).click();
      await expect(toolbar.getByRole('button', { name: reverse })).toBeVisible();
      const library = await (await page.request.get(url + '/api/library')).json();
      expect(library.documents.find((doc: { id: string }) => doc.id === 'stable').collection).toBe(
        collection,
      );
      await unchanged();
      expect(await scroller.evaluate((el) => el.scrollTop)).toBe(moveScroll);
    }
  }
  await page.screenshot({ path: testInfo.outputPath('after-move.png') });
  await unlink(path.join(root, 'notes/new.md'));
  await expect(reader.locator('.broken-link')).toBeVisible({ timeout: 20000 });
  await unchanged();
  await unlink(path.join(root, 'inbox/stable.md'));
  await expect(page.getByRole('status').filter({ hasText: '当前文档已移除' })).toBeVisible({
    timeout: 20000,
  });
  await expect(reader).toHaveCount(0);
  expect(
    await page.locator('.galaxy-viewport canvas').evaluate((el, old) => el === old, canvas),
  ).toBe(true);
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin);
  expect(errors).toEqual([]);
});

test('稳定阅读响应不包含开发客户端且拒绝源码路径', async ({ request }) => {
  const html = await (await request.get(url)).text();
  expect(html).not.toContain('/@vite/client');
  expect(html).toMatch(/\/assets\/[^" ]+\.js/);
  expect((await request.get(url + '/src/neural/main.tsx')).status()).toBe(404);
  const asset = html.match(/src="([^" ]+\.js)"/)![1];
  expect((await request.get(url + asset)).headers()['content-type']).toContain('javascript');
  expect((await request.head(url + asset)).status()).toBe(200);
});
