import { test, expect } from '@playwright/test';

test.use({ deviceScaleFactor: 2 });

test('高像素比阅读限制缓冲和帧率，多次看板往返释放画布与上下文', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const stats = { frame: 0, rendered: new Set<number>(), lost: 0 };
    Object.assign(window, { resourceStats: stats });
    const tick = () => {
      stats.frame++;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: Parameters<typeof original>
    ) {
      const context = original.apply(this, args);
      if (args[0] === 'webgl2' && !this.dataset.measured) {
        this.dataset.measured = 'true';
        this.addEventListener('webglcontextlost', () => stats.lost++);
      }
      return context;
    } as typeof original;
    const clear = WebGL2RenderingContext.prototype.clear;
    WebGL2RenderingContext.prototype.clear = function (mask) {
      stats.rendered.add(stats.frame);
      return clear.call(this, mask);
    };
  });
  await page.goto('/#/doc/first');
  await expect(page.locator('.reader-shell')).not.toHaveAttribute('inert');
  await expect(page.locator('.galaxy-viewport')).not.toHaveClass(/is-loading/);
  const pixels = await page
    .locator('.galaxy-viewport canvas')
    .evaluate((canvas: HTMLCanvasElement) => canvas.width * canvas.height);
  expect(pixels).toBeLessThanOrEqual(3_000_000);
  await page.waitForTimeout(4000);
  await page.evaluate(() => (window as any).resourceStats.rendered.clear());
  await page.waitForTimeout(2000);
  const frames = await page.evaluate(() => (window as any).resourceStats.rendered.size);
  if (page.viewportSize()!.width <= 900) expect(frames).toBe(0);
  else expect(frames).toBeGreaterThan(0);
  expect(frames).toBeLessThanOrEqual(65);
  // The navigation is covered by the full-screen reader on narrow displays.
  if (page.viewportSize()!.width <= 900)
    await page.getByRole('button', { name: '关闭文档', exact: true }).click();
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: '统计看板', exact: true }).click();
    await expect(page.locator('.galaxy-viewport canvas')).toHaveCount(0);
    await page.getByRole('button', { name: /返回星图|返回阅读/ }).click();
    await expect(page.locator('.galaxy-viewport canvas')).toHaveCount(1);
    await expect(page.locator('.galaxy-viewport')).not.toHaveClass(/is-loading/);
  }
  await expect
    .poll(() => page.evaluate(() => (window as any).resourceStats.lost))
    .toBeGreaterThanOrEqual(4);
  expect(errors).toEqual([]);
});
