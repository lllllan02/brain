import { test, expect } from '@playwright/test';

test('低帧率下星图与正文入场按实际时间完成', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'wide', '计时回归只需桌面动画模式');
  await page.addInitScript(() => {
    const request = window.requestAnimationFrame.bind(window);
    const cancel = window.cancelAnimationFrame.bind(window);
    const pending = new Map<number, number>();
    let nextId = 0;
    // Deliver real rAF timestamps at 4 fps, including correct cancellation.
    window.requestAnimationFrame = (callback) => {
      const id = ++nextId;
      const start = performance.now();
      const tick = (now: number) => {
        if (now - start >= 250) {
          pending.delete(id);
          callback(now);
        } else pending.set(id, request(tick));
      };
      pending.set(id, request(tick));
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      const handle = pending.get(id);
      if (handle !== undefined) cancel(handle);
      pending.delete(id);
    };
  });
  // No diagrams: this measures the scene and its shared reader timeline.
  await page.goto('/#/doc/second');
  await expect(page.locator('.galaxy-viewport')).not.toHaveClass(/is-loading/);
  const reader = page.locator('.reader-shell');
  await expect
    .poll(
      () =>
        reader.evaluate((element) =>
          element
            .getAnimations()
            .some((animation) => animation.effect?.getComputedTiming().progress === 1),
        ),
      { timeout: 7000 },
    )
    .toBe(true);
  await expect(reader).not.toHaveAttribute('inert');
});
