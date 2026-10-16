import { test, expect } from '@playwright/test';

test.use({ isMobile: true, hasTouch: true });

test('手机小屏与横屏的工具栏、列表和看板不溢出', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'narrow', '仅验收触屏布局');
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/#/doc/first');
    await expect(page.locator('.reader-shell')).not.toHaveAttribute('inert');
    await expect(page.locator('.diagram-canvas svg')).toHaveCount(4);
    const toolbar = page.locator('.reader-toolbar');
    expect(await toolbar.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    const controls = toolbar.locator('button:visible, select:visible');
    const boxes = await controls.evaluateAll((elements) =>
      elements.map((el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, height: r.height };
      }),
    );
    for (let i = 0; i < boxes.length; i++) {
      expect(boxes[i].left).toBeGreaterThanOrEqual(0);
      expect(boxes[i].right).toBeLessThanOrEqual(viewport.width);
      expect(boxes[i].height).toBeGreaterThanOrEqual(44);
      for (const other of boxes.slice(i + 1)) {
        expect(
          boxes[i].right <= other.left ||
            other.right <= boxes[i].left ||
            boxes[i].bottom <= other.top ||
            other.bottom <= boxes[i].top,
        ).toBe(true);
      }
    }
    await page.getByRole('button', { name: '打开阅读列表', exact: true }).tap();
    const list = await page.locator('.cluster-list').boundingBox();
    const bar = await toolbar.boundingBox();
    expect(list!.y).toBeGreaterThanOrEqual(bar!.y + bar!.height);
    await expect(page.locator('.cluster-list-item').first()).toBeInViewport();
    await page.getByRole('button', { name: '返回正文', exact: true }).tap();
    await page.screenshot({
      animations: 'disabled',
      path: testInfo.outputPath(`reader-${viewport.width}.png`),
    });
    await page.getByRole('button', { name: '关闭文档', exact: true }).tap();
    await page.getByRole('button', { name: '统计看板', exact: true }).tap();
    const dashboard = page.locator('.workbench');
    await expect(dashboard).toBeVisible();
    expect(await dashboard.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await dashboard.evaluate((el) => el.scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({
      animations: 'disabled',
      path: testInfo.outputPath(`dashboard-${viewport.width}.png`),
    });
    await page.locator('.activity-panel').scrollIntoViewIfNeeded();
    await page.screenshot({
      animations: 'disabled',
      path: testInfo.outputPath(`activity-${viewport.width}.png`),
    });
    await page.getByRole('button', { name: '返回星图', exact: true }).tap();
  }
});

test('触屏搜索与随机复习各自保留完整操作空间', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'narrow', '仅验收触屏布局');
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await page.getByRole('button', { name: '随机复习一篇笔记', exact: true }).tap();
  await expect(page.locator('.galaxy-review-title')).toBeVisible();
  const search = page.getByRole('combobox', { name: '搜索标题、别名、标签或正文' });
  const searchBox = await page.locator('.galaxy-search').boundingBox();
  expect(searchBox!.width).toBeGreaterThanOrEqual(280);
  await page.screenshot({ animations: 'disabled', path: testInfo.outputPath('home-review.png') });
  await search.tap();
  await search.fill('自动化入口');
  await expect(page.locator('.cluster-fan')).toBeHidden();
  const result = page.getByRole('option', { name: /回归起点/ });
  await expect(result).toBeInViewport();
  expect((await search.boundingBox())!.y).toBeLessThan(180);
  await page.screenshot({ animations: 'disabled', path: testInfo.outputPath('search.png') });
  await result.tap();
  await expect(page.locator('.document-reader[data-document-id="first"]')).toBeVisible();
});
