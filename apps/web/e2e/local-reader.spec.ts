import { test, expect } from '@playwright/test';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
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

test('连续内容更新保留画布、正文、选区和滚动，主动应用最新版本', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url + '/#/doc/stable');
  const reader = page.locator('.document-reader');
  await expect(reader).toBeVisible();
  await expect(page.locator('.reader-shell')).not.toHaveAttribute('inert');
  await expect(page.locator('.galaxy-viewport')).not.toHaveClass(/is-loading/);
  const canvas = await page.locator('.galaxy-viewport canvas').elementHandle();
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
  const timeOrigin = await page.evaluate(() => performance.timeOrigin);
  await writeFile(path.join(root, 'inbox/stable.md'), body('第一次修改'));
  const update = page.getByRole('button', { name: '更新内容', exact: true });
  await expect(update).toBeVisible({ timeout: 20000 });
  await writeFile(path.join(root, 'notes/new.md'), '---\ntitle: 新文章\n---\n新内容');
  await writeFile(path.join(root, 'inbox/stable.md'), body('最新正文'));
  await page.waitForResponse(
    async (response) =>
      response.url().endsWith('/api/library') &&
      response.status() === 200 &&
      (await response.text()).includes('最新正文'),
    { timeout: 20000 },
  );
  expect(await paragraph.evaluate((el, old) => el === old, original)).toBe(true);
  expect(
    await page.locator('.galaxy-viewport canvas').evaluate((el, old) => el === old, canvas),
  ).toBe(true);
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe(
    '连续阅读中的正文 10。',
  );
  expect(await scroller.evaluate((el) => el.scrollTop)).toBe(scroll);
  await expect(reader).toContainText('初始正文');
  if (page.viewportSize()!.width <= 900) {
    const noticeBounds = (await page.locator('.library-update-notice').boundingBox())!;
    const readerBounds = (await reader.boundingBox())!;
    expect(noticeBounds.y + noticeBounds.height).toBeLessThanOrEqual(readerBounds.y);
  }
  await page.screenshot({ path: testInfo.outputPath('pending-update.png') });
  await update.click();
  await expect(reader).toContainText('最新正文');
  await expect(update).toHaveCount(0);
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin);
  await expect(page.locator('.reader-shell')).not.toHaveAttribute('inert');
  const toolbar = reader.locator('.reader-toolbar');
  const moveCanvas = await page.locator('.galaxy-viewport canvas').elementHandle();
  const moveParagraph = await paragraph.elementHandle();
  const moveScroll = await scroller.evaluate((el) => el.scrollTop);
  // Observe transient remounts/re-entry too, not merely the final successful state.
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
      expect(
        await page.locator('.galaxy-viewport canvas').evaluate((el, old) => el === old, moveCanvas),
      ).toBe(true);
      expect(await paragraph.evaluate((el, old) => el === old, moveParagraph)).toBe(true);
      expect(await scroller.evaluate((el) => el.scrollTop)).toBe(moveScroll);
      expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin);
      await expect(page.locator('.galaxy-viewport')).toHaveAttribute('data-test-reentries', '0');
    }
  }
  await page.screenshot({ path: testInfo.outputPath('after-move.png') });
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
