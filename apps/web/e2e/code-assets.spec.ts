import { test, expect } from '@playwright/test';

test('代码附件预览、复制、下载和错误状态', async ({ page, context }, testInfo) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/#/doc/first');
  const link = page.locator('.document-reader .code-asset-link').filter({ hasText: '完整代码' });
  await expect(link).toBeVisible();
  if (testInfo.project.name !== 'narrow') {
    await link.hover();
    await expect(page.getByRole('dialog', { name: '代码预览：demo.go' })).toBeVisible();
  }
  await link.click();
  const preview = page.getByRole('dialog', { name: '代码预览：demo.go' });
  await expect(preview.locator('code')).toContainText('func main()');
  await expect(preview.locator('.hljs-keyword').first()).toBeVisible();
  await expect(preview.locator('script')).toHaveCount(0);
  await preview.getByRole('button', { name: '复制代码', exact: true }).click();
  await expect(preview.getByRole('button', { name: '已复制' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('package main');
  const downloadPromise = page.waitForEvent('download');
  await preview.getByRole('button', { name: '下载源文件' }).click();
  expect((await downloadPromise).suggestedFilename()).toBe('demo.go');
  const box = await preview.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  if (await preview.evaluate((el) => el.classList.contains('is-inline'))) {
    const linkBox = await link.boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(linkBox!.y + linkBox!.height);
  } else {
    const readerBox = await page.locator('.reader-shell').boundingBox();
    expect(
      box!.x + box!.width <= readerBox!.x || box!.x >= readerBox!.x + readerBox!.width,
    ).toBeTruthy();
  }
  expect(await link.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain(
    'linear-gradient',
  );
  await page.screenshot({ path: testInfo.outputPath('code-preview.png') });
  await page.keyboard.press('Escape');
  await expect(preview).toHaveCount(0);
  await page.locator('.document-reader .code-asset-link').filter({ hasText: '缺失代码' }).click();
  await expect(page.getByRole('alert')).toContainText('附件不存在');
  await page.getByRole('button', { name: '关闭代码预览' }).click();
  await expect(page.getByRole('dialog', { name: /代码预览/ })).toHaveCount(0);
});
