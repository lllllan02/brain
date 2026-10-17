import { test, expect } from '@playwright/test';
import { mkdtemp, mkdir, writeFile, readFile, rm, unlink } from 'node:fs/promises';
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
  await mkdir(path.join(root, 'readings'));
  await mkdir(path.join(root, 'notes'));
  await writeFile(path.join(root, 'notes/stable.md'), body('初始正文'));
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
  await writeFile(path.join(root, 'notes/stable.md'), body('初始正文') + diagram);
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
    // Read one coherent snapshot. Re-resolving each locator adds browser round trips
    // under software WebGL and can exhaust the test budget across repeated updates.
    const state = await page.evaluate(
      ({ canvas, original, svg }) => {
        const viewport = document.querySelector('.galaxy-viewport');
        const article = document.querySelector('.document-reader');
        return {
          sameCanvas: !!canvas && viewport?.querySelector('canvas') === canvas,
          sameParagraph: !!original && article?.contains(original),
          sameDiagram: !!svg && article?.querySelector('.diagram-canvas svg') === svg,
          paragraphY: original?.getBoundingClientRect().top,
          timeOrigin: performance.timeOrigin,
          reentries: viewport?.getAttribute('data-test-reentries'),
        };
      },
      { canvas, original, svg },
    );
    expect(state).toMatchObject({
      sameCanvas: true,
      sameParagraph: true,
      sameDiagram: true,
      timeOrigin,
      reentries: '0',
    });
    expect(state.paragraphY).toBeCloseTo(paragraphY, 0);
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
    path.join(root, 'notes/stable.md'),
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
  await writeFile(path.join(root, 'notes/stable.md'), updatedBody);
  await expect(reader.locator('.reader-toolbar')).toContainText('新标题', { timeout: 20000 });
  await unchanged();
  const moveScroll = await scroller.evaluate((el) => el.scrollTop);
  const toolbar = reader.locator('.reader-toolbar');
  for (const filtered of page.viewportSize()!.width <= 900 ? [false] : [false, true]) {
    if (filtered) await page.getByTitle('按目录展开星云', { exact: true }).click();
    for (const [action, reverse, collection] of [
      ['标为阅读中', '标为已整理', 'reading'],
      ['标为已整理', '标为待学习', 'organized'],
      ['标为待学习', '标为阅读中', 'pending'],
    ]) {
      await toolbar.getByRole('button', { name: action }).click();
      await expect(toolbar.getByRole('button', { name: reverse })).toBeVisible();
      const library = await (await page.request.get(url + '/api/library')).json();
      expect(library.documents.find((doc: { id: string }) => doc.id === 'stable').state).toBe(
        collection,
      );
      await unchanged();
      expect(await scroller.evaluate((el) => el.scrollTop)).toBe(moveScroll);
    }
  }
  await page.screenshot({ path: testInfo.outputPath('after-state.png') });
  await unlink(path.join(root, 'notes/new.md'));
  await expect(reader.locator('.broken-link')).toBeVisible({ timeout: 20000 });
  await unchanged();
  await unlink(path.join(root, 'notes/stable.md'));
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

test('状态切换贯通文件、内链高亮、预览和节点标签', async ({ page }, testInfo) => {
  await writeFile(
    path.join(root, 'notes/state-board.md'),
    '---\ntitle: 状态验收\ncategory: 验收\n---\n比较 [[state-pending|待学习笔记]] 与 [[state-done|已理解笔记]]。\n\n导读：[[state-guide|阅读导读]] 与 [[state-other|另一篇未读导读]]。',
  );
  await writeFile(
    path.join(root, 'notes/state-pending.md'),
    '---\ntitle: 待学习笔记\ncategory: 验收\n---\n正文',
  );
  await writeFile(
    path.join(root, 'notes/state-done.md'),
    '---\ntitle: 已理解笔记\ncategory: 验收\nlearning_status: understood\n---\n正文',
  );
  const guide = '---\ntitle: 阅读导读\ncategory: 验收\nsource: https://example.com\n---\n导读正文';
  await writeFile(path.join(root, 'readings/state-guide.md'), guide);
  await writeFile(
    path.join(root, 'readings/state-other.md'),
    '---\ntitle: 另一篇未读导读\ncategory: 验收\n---\n正文',
  );
  await page.goto(url + '/#/doc/state-board');
  const reader = page.locator('.document-reader[data-document-id]');
  await expect(page.locator('.reader-shell')).not.toHaveAttribute('inert');
  const link = reader.locator('.markdown a[href="#/doc/state-guide"]');
  await expect(link).toHaveAttribute('data-state', 'pending');
  await expect(reader.locator('.markdown a[href="#/doc/state-pending"]')).toHaveAttribute(
    'data-state',
    'pending',
  );
  await expect(reader.locator('.markdown a[href="#/doc/state-done"]')).toHaveAttribute(
    'data-state',
    'organized',
  );
  const unreadHighlight = await link.evaluate((el) =>
    getComputedStyle(el).getPropertyValue('--link-opacity'),
  );
  await link.click();
  await expect(reader).toHaveAttribute('data-document-id', 'state-guide');
  await expect(page.locator('.reader-shell')).not.toHaveAttribute('inert');
  await reader.getByRole('button', { name: '标为阅读中', exact: true }).click();
  await expect(reader.getByRole('button', { name: '标为已整理', exact: true })).toBeVisible();
  await reader.getByRole('button', { name: '标为已整理', exact: true }).click();
  await expect(reader.getByRole('button', { name: '标为待学习', exact: true })).toBeVisible();
  await expect(page.locator('body > .document-state-toast')).toHaveText('已标记为已整理');
  await expect(
    reader.locator('.reader-heading .collection-title-icon[data-state="organized"]'),
  ).toBeVisible();
  await expect(page.locator('.galaxy-label.is-current')).toContainText('已整理');
  const raw = await readFile(path.join(root, 'readings/state-guide.md'), 'utf8');
  expect(raw).toContain('learning_status: organized');
  expect(
    raw
      .replace('learning_status: organized\n', '')
      .replace(/^learning_status_changed_at:[^\r\n]*\r?\n/gm, ''),
  ).toBe(guide);
  await page.goBack();
  await expect(link).toHaveAttribute('data-state', 'organized');
  expect(
    await link.evaluate((el) => getComputedStyle(el).getPropertyValue('--link-opacity')),
  ).not.toBe(unreadHighlight);
  await expect(link.locator('.state-check')).toHaveCount(1);
  await link.focus();
  const preview = page.getByRole('dialog', { name: '预览：阅读导读' });
  await expect(preview).toBeVisible();
  await expect(preview.locator('.collection-title-icon')).toHaveAttribute(
    'data-state',
    'organized',
  );
  await expect(preview.locator('.link-preview-label')).toContainText('已整理');
  await page.screenshot({ path: testInfo.outputPath('states-and-preview.png') });
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(link).toHaveAttribute('data-state', 'organized');
  expect(await readFile(path.join(root, 'notes/state-board.md'), 'utf8')).not.toContain('read:');
  const guideFile = path.join(root, 'readings/state-guide.md');
  await writeFile(guideFile, raw.replace('导读正文', '修改后的导读正文'));
  await expect(link).toHaveAttribute('data-state', 'reading', { timeout: 20000 });
  await expect(link.locator('.state-check')).toHaveCount(0);
  expect(await readFile(guideFile, 'utf8')).toContain('learning_status: reading');
  await writeFile(guideFile, (await readFile(guideFile, 'utf8')) + '\n再次修改。');
  await expect
    .poll(
      async () =>
        (await (await page.request.get(url + '/api/library')).json()).documents.find(
          (doc: { id: string }) => doc.id === 'state-guide',
        ).state,
    )
    .toBe('reading');
  expect(await readFile(guideFile, 'utf8')).toContain('learning_status: reading');
});

test('旧待阅读记录迁入文件状态后清除，刷新仍保留阅读中', async ({ page }) => {
  const file = path.join(root, 'notes/legacy-queue.md');
  await writeFile(file, '---\ntitle: 迁移验收\nlearning_status: pending\n---\n正文');
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('legacy-queue-seeded')) {
      localStorage.setItem('horizon:reading-queue:v1:/', JSON.stringify(['legacy-queue']));
      sessionStorage.setItem('legacy-queue-seeded', 'true');
    }
  });
  await page.goto(url + '/#/doc/legacy-queue');
  const reader = page.locator('.document-reader[data-document-id="legacy-queue"]');
  await expect(reader.getByRole('button', { name: '标为已整理', exact: true })).toBeVisible();
  expect(await readFile(file, 'utf8')).toContain('learning_status: reading');
  expect(await page.evaluate(() => localStorage.getItem('horizon:reading-queue:v1:/'))).toBeNull();
  await page.reload();
  await expect(reader.getByRole('button', { name: '标为已整理', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /加入待阅读|移出待阅读/ })).toHaveCount(0);
});

test('状态立即响应慢请求，保存失败恢复原状态且不改正文', async ({ page }) => {
  const file = path.join(root, 'notes/fast-state.md');
  await writeFile(file, '---\ntitle: 快速状态验收\nlearning_status: pending\n---\n保持这段正文');
  await page.goto(url + '/#/doc/fast-state');
  const reader = page.locator('.document-reader[data-document-id="fast-state"]');
  await expect(reader.getByRole('button', { name: '标为阅读中', exact: true })).toBeEnabled();
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/documents/state', async (route) => {
    await blocked;
    await route.continue();
  });
  const latency = await page.evaluate(async () => {
    const button = document.querySelector<HTMLButtonElement>('.document-state-toggle')!;
    const start = performance.now();
    const updated = new Promise<number>((resolve) => {
      const observer = new MutationObserver(() => {
        if (button.dataset.state === 'reading') {
          observer.disconnect();
          resolve(performance.now() - start);
        }
      });
      observer.observe(button, { attributes: true });
    });
    button.click();
    return updated;
  });
  expect(latency).toBeLessThan(250);
  await expect(reader.getByRole('button', { name: '标为已整理', exact: true })).toBeDisabled();
  await expect(page.locator('.document-state-toast')).toHaveCount(0);
  expect(await readFile(file, 'utf8')).toContain('learning_status: pending');
  release();
  await expect(reader.getByRole('button', { name: '标为已整理', exact: true })).toBeEnabled();
  expect(await readFile(file, 'utf8')).toContain('learning_status: reading');
  await page.unroute('**/api/documents/state');
  await page.route('**/api/documents/state', (route) =>
    route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({ error: '文档已被其他编辑修改' }),
    }),
  );
  await reader.getByRole('button', { name: '标为已整理', exact: true }).click();
  await expect(page.locator('.document-state-toast')).toHaveText('文档已被其他编辑修改');
  await expect(reader.getByRole('button', { name: '标为已整理', exact: true })).toBeEnabled();
  expect(await readFile(file, 'utf8')).toContain('learning_status: reading');
  await expect(reader.locator('.markdown')).toContainText('保持这段正文');
});

test('阅读中按状态修改时间排列，重新进入置前，正文修改和刷新保持顺序', async ({ page }) => {
  const first = path.join(root, 'notes/order-a.md');
  const second = path.join(root, 'notes/order-b.md');
  await writeFile(first, '---\ntitle: 顺序甲\nlearning_status: pending\n---\n甲正文');
  const old =
    '---\ntitle: 顺序乙\nlearning_status: reading\nlearning_status_changed_at: "2020-01-01T00:00:00.000+08:00"\n---\n乙正文';
  await writeFile(second, old);
  await page.goto(url + '/#/doc/order-a');
  const reader = page.locator('.document-reader[data-document-id="order-a"]');
  await reader.getByRole('button', { name: '标为阅读中', exact: true }).click();
  await expect(reader.getByRole('button', { name: '标为已整理', exact: true })).toBeEnabled();
  if (page.viewportSize()!.width <= 900)
    await page.getByRole('button', { name: '打开阅读列表', exact: true }).click();
  const navigation = page.getByRole('navigation', { name: /^文档列表模式/ });
  await navigation.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.cluster-list-item').first()).toContainText('顺序甲');
  expect(await readFile(first, 'utf8')).toContain('learning_status_changed_at:');
  await writeFile(second, old.replace('乙正文', '修改后的乙正文'));
  await page.reload();
  await expect(page.locator('.cluster-list-item').first()).toContainText('顺序甲');
  for (const state of ['organized', 'pending', 'reading']) {
    const library = await (await page.request.get(url + '/api/library')).json();
    const response = await page.request.post(url + '/api/documents/state', {
      headers: { Origin: url },
      data: { id: 'order-b', state, version: library.version },
    });
    expect(response.ok()).toBe(true);
  }
  await page.reload();
  await expect(page.locator('.cluster-list-item').first()).toContainText('顺序乙');
});
