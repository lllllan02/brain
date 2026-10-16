import { test, expect } from '@playwright/test';

test('文档字号同步缩放并在跳转和刷新后保留', async ({ page }, testInfo) => {
  await page.goto('/#/doc/first');
  const reader = page.locator('.document-reader[data-document-id]');
  const size = reader.getByRole('combobox', { name: '文档字号' });
  await expect(size).toHaveValue('100');
  const bodySize = page.viewportSize()!.width <= 900 ? 16 : 13;
  await size.selectOption('150');
  await expect(reader.locator('.markdown')).toHaveCSS('font-size', `${bodySize * 1.5}px`);
  await expect(reader.locator('.an-title-row h2')).toHaveCSS(
    'font-size',
    page.viewportSize()!.width <= 760 ? '31.5px' : '34.5px',
  );
  await expect(reader.locator('.markdown pre').first()).toHaveCSS(
    'font-size',
    page.viewportSize()!.width <= 900 ? '19.5px' : '16.5px',
  );
  await expect(page.locator('.reader-shell')).not.toHaveAttribute('inert');
  await page.screenshot({ path: testInfo.outputPath('large-font.png') });
  const toolbar = reader.locator('.reader-toolbar');
  expect(await toolbar.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await reader.getByRole('link', { name: /^回归终点/ }).click();
  await expect(reader).toHaveAttribute('data-document-id', 'second');
  await expect(size).toHaveValue('150');
  await page.reload();
  await expect(size).toHaveValue('150');
  await size.selectOption('85');
  await expect(reader.locator('.markdown')).toHaveCSS(
    'font-size',
    `${Number((bodySize * 0.85).toFixed(2))}px`,
  );
  await size.selectOption('100');
  await expect(reader.locator('.markdown')).toHaveCSS('font-size', `${bodySize}px`);
});

test('异常字号记忆回退到默认大小', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('horizon:reader-font-scale:v1:/', '999');
  });
  await page.goto('/#/doc/first');
  await expect(page.getByRole('combobox', { name: '文档字号' })).toHaveValue('100');
});
