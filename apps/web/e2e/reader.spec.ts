import { test, expect } from '@playwright/test';

test('搜索、正文跳转、前后导航、刷新和看板往返保持阅读能力', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const search = page.getByRole('combobox', { name: '搜索标题、别名、标签或正文' });
  await search.fill('自动化入口');
  await page.getByRole('option', { name: /回归起点/ }).click();
  const reader = page.locator('.document-reader[data-document-id="first"]');
  await expect(reader).toBeVisible();
  await expect(reader.locator('.diagram-canvas svg')).toHaveCount(4);
  await expect(page.locator('.reader-shell')).not.toHaveAttribute('inert');
  await page.screenshot({ path: testInfo.outputPath('reader.png') });
  await reader.getByRole('link', { name: /^回归终点/ }).click();
  await expect(page.locator('.document-reader[data-document-id="second"]')).toBeVisible();
  await page.goBack();
  await expect(reader).toBeVisible();
  await page.goForward();
  await expect(page.locator('.document-reader[data-document-id="second"]')).toBeVisible();
  await page.reload();
  await expect(page.locator('.document-reader[data-document-id="second"]')).toBeVisible();
  if (page.viewportSize()!.width <= 900)
    await page.getByRole('button', { name: '关闭文档', exact: true }).click();
  else await page.getByRole('link', { name: '视界，回到全景' }).click();
  await expect(page.locator('.document-reader')).toHaveCount(0);
  await expect(page.locator('.galaxy-viewport')).not.toHaveClass(/is-loading/);
  await page.screenshot({ path: testInfo.outputPath('home.png') });
  await page.getByRole('button', { name: /统计看板/ }).click();
  await expect(page.locator('.workbench')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('dashboard.png') });
  await page.getByRole('button', { name: /返回星/ }).click();
  await expect(search).toBeVisible();
  await search.fill('回归终点');
  await page.getByRole('option', { name: /回归终点/ }).click();
  await expect(page.locator('.document-reader[data-document-id="second"]')).toBeVisible();
  expect(errors).toEqual([]);
});

test('损坏的浏览器记忆安全回退，静态预览保持只读', async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('horizon:view:v1:/:galaxyReturnFocus', '{"sel":7}');
    sessionStorage.setItem('horizon:view:v1:/:pinnedList', '{"category":"x","pinnedIds":[null]}');
    sessionStorage.setItem('horizon:reading:v1:/', '{"entries":[null]}');
  });
  await page.goto('/#/doc/first');
  await expect(page.locator('.document-reader[data-document-id="first"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /标为/ })).toHaveCount(0);
});

test('阅读列表过渡、看板返回阅读和快速反向导航', async ({ page }) => {
  await page.goto('/#/doc/first');
  await expect(page.locator('.reader-shell')).not.toHaveAttribute('inert');
  if (page.viewportSize()!.width <= 900)
    await page.getByRole('button', { name: '打开阅读列表' }).click();
  await page.locator('.cluster-list-item').filter({ hasText: '回归终点' }).click();
  await expect(page.locator('.document-reader[data-document-id="second"]')).toBeVisible();
  if (page.viewportSize()!.width <= 900) {
    await page.getByRole('button', { name: '关闭文档', exact: true }).click();
    await page.goBack();
    await expect(page.locator('.reader-shell')).not.toHaveAttribute('inert');
  } else {
    await page.getByRole('button', { name: '统计看板', exact: true }).click();
    await page.getByRole('button', { name: '返回阅读', exact: true }).click();
  }
  await expect(page.locator('.document-reader[data-document-id="second"]')).toBeVisible();
  if (page.viewportSize()!.width <= 900)
    await page.getByRole('button', { name: '关闭文档', exact: true }).click();
  else await page.getByRole('link', { name: '视界，回到全景' }).click();
  await page.goBack();
  await expect(page.locator('.document-reader[data-document-id="second"]')).toBeVisible();
  await expect(page.locator('.reader-shell')).not.toHaveAttribute('inert');
  await expect(page.locator('.galaxy-viewport canvas')).toHaveCount(1);
});

test('阅读建议与手机全屏列表保留正文位置', async ({ page }, testInfo) => {
  await page.goto('/#/doc/first');
  await expect(page.locator('.reader-shell')).not.toHaveAttribute('inert');
  const reader = page.locator('.document-reader[data-document-id="first"]');
  if (page.viewportSize()!.width > 900)
    await expect(reader.locator('.mobile-reading-list-toggle')).toBeHidden();
  await expect(reader.locator('.diagram-canvas svg')).toHaveCount(4);
  await reader.getByRole('button', { name: '建议阅读 1' }).click();
  await expect(page.locator('.cluster-list-item')).toHaveCount(1);
  await expect(page.locator('.cluster-list-item')).toContainText('回归终点');
  const navigation = page.getByRole('navigation', { name: /^文档列表模式/ });
  await expect(navigation.getByRole('button')).toHaveCount(2);
  await expect(navigation.getByRole('button', { name: '建议阅读 1' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('navigation', { name: /^列表类型与状态筛选/ })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('suggestions.png') });
  await navigation.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.cluster-list-item')).toContainText('回归终点');
  await expect(navigation.getByRole('button', { name: '阅读中 1' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: /加入待阅读|移出待阅读/ })).toHaveCount(0);
  await page.keyboard.press('ArrowLeft');
  // The original roller supports pointer dragging on both desktop and mobile layouts.
  const modeBounds = (await navigation.boundingBox())!;
  await page.mouse.move(
    modeBounds.x + modeBounds.width * 0.7,
    modeBounds.y + modeBounds.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    modeBounds.x + modeBounds.width * 0.3,
    modeBounds.y + modeBounds.height / 2,
    {
      steps: 8,
    },
  );
  await page.mouse.up();
  await expect(navigation.getByRole('button', { name: '阅读中 1' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.cluster-list-item')).toHaveCount(1);
  await expect(page.locator('.cluster-list-item')).toContainText('回归终点');
  await expect(page.locator('.cluster-list-item')).toBeInViewport();
  await expect
    .poll(() =>
      page
        .locator('.cluster-list-item')
        .evaluate((element) => Number(getComputedStyle(element).opacity)),
    )
    .toBe(1);
  await page.screenshot({ path: testInfo.outputPath('reading-queue.png') });
  await navigation.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.cluster-list-item')).toContainText('回归终点');
  if (page.viewportSize()!.width <= 900) {
    await page.getByRole('button', { name: '返回正文', exact: true }).click();
    const bounds = await page.locator('.reader-shell').boundingBox();
    expect(bounds!.x).toBe(0);
    expect(bounds!.y).toBe(0);
    expect(bounds!.width).toBe(page.viewportSize()!.width);
    expect(bounds!.height).toBe(page.viewportSize()!.height);
    const scroller = reader.locator('.an-scroll');
    await scroller.evaluate((element) => {
      element.scrollTo({ top: 180, behavior: 'instant' });
    });
    const top = await scroller.evaluate((element) => element.scrollTop);
    await page.getByRole('button', { name: '打开阅读列表' }).click();
    await page.getByRole('button', { name: '返回正文', exact: true }).click();
    expect(await scroller.evaluate((element) => element.scrollTop)).toBe(top);
    await page.screenshot({ path: testInfo.outputPath('mobile-full-reader.png') });
    const originalViewport = page.viewportSize()!;
    for (const viewport of [
      { width: 320, height: 568 },
      { width: 844, height: 390 },
      { width: 768, height: 1024 },
    ]) {
      await page.setViewportSize(viewport);
      await expect
        .poll(async () => {
          const rect = await page.locator('.reader-shell').boundingBox();
          return (
            rect &&
            Math.round(rect.width) === viewport.width &&
            Math.round(rect.height) === viewport.height &&
            rect.x === 0 &&
            rect.y === 0
          );
        })
        .toBe(true);
      await expect(page.getByRole('button', { name: '关闭文档', exact: true })).toBeInViewport();
    }
    await page.setViewportSize(originalViewport);
    await page.getByRole('button', { name: '打开阅读列表' }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: '打开阅读列表' })).toBeVisible();
    await page.getByRole('button', { name: '打开阅读列表' }).click();
  }
  await page.locator('.cluster-list-item').click();
  await expect(page.locator('.document-reader[data-document-id="second"]')).toBeVisible();
  await page.reload();
  await expect(page.locator('.document-reader[data-document-id="second"]')).toBeVisible();
});
