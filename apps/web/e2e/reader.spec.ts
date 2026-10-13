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
  await page.getByRole('link', { name: '视界，回到全景' }).click();
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
  await page.locator('.cluster-list-item').filter({ hasText: '回归终点' }).click();
  await expect(page.locator('.document-reader[data-document-id="second"]')).toBeVisible();
  await page.getByRole('button', { name: '统计看板', exact: true }).click();
  await page.getByRole('button', { name: '返回阅读', exact: true }).click();
  await expect(page.locator('.document-reader[data-document-id="second"]')).toBeVisible();
  await page.getByRole('link', { name: '视界，回到全景' }).click();
  await page.goBack();
  await expect(page.locator('.document-reader[data-document-id="second"]')).toBeVisible();
  await expect(page.locator('.reader-shell')).not.toHaveAttribute('inert');
  await expect(page.locator('.galaxy-viewport canvas')).toHaveCount(1);
});
