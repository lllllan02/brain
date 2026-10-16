import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          (window as unknown as { copied: string }).copied = text;
        },
      },
    });
  });
  await page.goto('/#/doc/first');
  await expect(page.locator('.reader-shell')).not.toHaveAttribute('inert');
});

test('选区复制保留原文和文件章节定位，支持键盘与清除', async ({ page }, testInfo) => {
  const paragraph = page.locator('.document-reader article.markdown > p').first();
  await paragraph.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
  });
  const group = page.getByRole('group', { name: '复制选中文字' });
  await expect(group).toBeVisible();
  const original = await page.evaluate(() => window.getSelection()!.toString());
  await group.getByRole('button', { name: '复制纯文本' }).click();
  expect(await page.evaluate(() => (window as unknown as { copied: string }).copied)).toBe(
    original,
  );
  expect(await page.evaluate(() => window.getSelection()!.toString())).toBe(original);
  await group.getByRole('button', { name: '复制引用' }).focus();
  await page.keyboard.press('Enter');
  const copied = await page.evaluate(() => (window as unknown as { copied: string }).copied);
  expect(copied).toContain('文档：回归起点');
  expect(copied).toContain('notes/first.md');
  expect(copied).toContain('章节：回归起点');
  expect(copied).toContain(`> ${original}`);
  expect(copied).toContain('以下是 Horizon 项目中的文档引用：');
  expect(copied).toContain('网页选中文本：');
  expect(copied).not.toContain('阅读链接：');
  expect(copied).not.toContain('目录：');
  await expect(group.getByRole('status')).toHaveText('引用已复制');
  const bounds = await group.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.screenshot({ path: testInfo.outputPath('selection-copy.png') });
  await page.keyboard.press('Escape');
  await expect(group).toHaveCount(0);
  await expect(page.locator('.document-reader')).toBeVisible();
});

test('跨章节引用包含层级和结束章节，失败可重试', async ({ page }) => {
  await page.locator('.document-reader article.markdown').evaluate((article) => {
    const section = document.createElement('section');
    section.innerHTML =
      '<h2 id="outer">外层</h2><h3 id="inner">内层</h3><p id="excerpt-start">第一段</p><h2 id="next">下一节</h2><p id="excerpt-end">第二段</p>';
    article.append(section);
    const range = document.createRange();
    range.setStart(section.querySelector('#excerpt-start')!.firstChild!, 0);
    range.setEnd(section.querySelector('#excerpt-end')!.firstChild!, 3);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
  });
  const group = page.getByRole('group', { name: '复制选中文字' });
  await group.getByRole('button', { name: '复制引用' }).click();
  expect(await page.evaluate(() => (window as unknown as { copied: string }).copied)).toContain(
    '章节：回归起点 → 外层 → 内层 至 回归起点 → 下一节',
  );
  await page.evaluate(() => {
    navigator.clipboard.writeText = async () => {
      throw new Error('denied');
    };
  });
  await group.getByRole('button', { name: '复制引用' }).click();
  await expect(group.getByRole('status')).toContainText('复制失败');
  await expect(group.getByRole('button', { name: '复制引用' })).toBeEnabled();
  await page.locator('.an-title-row h2').click();
  await expect(group).toHaveCount(0);
});

test('章节标题边界与 HTTP 复制兼容', async ({ page }, testInfo) => {
  if (testInfo.project.name === 'narrow') await page.setViewportSize({ width: 320, height: 640 });
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    document.execCommand = (command: string) => {
      if (command !== 'copy') return false;
      (window as unknown as { copied: string }).copied = (
        document.activeElement as HTMLTextAreaElement
      ).value;
      return true;
    };
  });
  await page.locator('.document-reader article.markdown').evaluate((article) => {
    const section = document.createElement('section');
    section.innerHTML =
      '<h2 id="selected-heading">选中章节</h2><p>段落内容</p><h2 id="excluded-heading">未选章节</h2>';
    article.append(section);
    const range = document.createRange();
    range.setStartBefore(section.firstChild!);
    range.setEnd(section.lastChild!.firstChild!, 0);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
  });
  const group = page.getByRole('group', { name: '复制选中文字' });
  await group.getByRole('button', { name: '复制引用' }).click();
  const copied = await page.evaluate(() => (window as unknown as { copied: string }).copied);
  expect(copied).toContain('章节：回归起点 → 选中章节\n');
  expect(copied).not.toContain('未选章节');
  expect(copied).toContain('文件：content/notes/first.md');
  await expect(group.getByRole('status')).toHaveText('引用已复制');
  await page.screenshot({ path: testInfo.outputPath('selection-copy-boundary.png') });
});
