import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-17T12:00:00+08:00'));
  await page.route('**/library.json', async (route) => {
    const response = await route.fetch();
    const library = await response.json();
    const base = library.documents.find((d: { id: string }) => d.id === 'first');
    library.documents.push(
      ...Array.from({ length: 18 }, (_, i) => ({
        ...base,
        id: `dashboard-${i}`,
        path: `content/${i === 0 ? 'readings' : 'notes'}/dashboard-${i}.md`,
        title: i === 0 ? '外部资料测试导读' : `独立验收文档 ${i}`,
        collection: i === 0 ? 'readings' : 'notes',
        category: `验收专题 ${i % 5}`,
        aliases: [],
        tags: ['看板测试'],
        state: i < 3 ? 'reading' : i === 3 ? 'organized' : 'pending',
        sources: i === 0 ? ['https://example.com/article'] : [],
        created: '2026-10-16',
        updated: '2026-10-17',
        html: '<p>独立验收文档。</p>',
        body: '独立验收文档。',
        summary: '独立验收文档。',
        references: [],
        backlinks: [],
        issues: [],
        readingSuggestions: [],
        parent: null,
        parentTarget: null,
      })),
    );
    library.activity = {
      startedAt: '2026-10-01T00:00:00+08:00',
      version: 'dashboard-test',
      events: [
        {
          id: 'e1',
          kind: 'created',
          time: '2026-10-16T04:00:00Z',
          entity: 'doc:dashboard-0',
          docId: 'dashboard-0',
          title: '外部资料测试导读',
          collections: ['readings'],
          source: 'metadata',
        },
        {
          id: 'e2',
          kind: 'updated',
          time: '2026-10-17T04:00:00Z',
          entity: 'doc:first',
          docId: 'first',
          title: '回归起点',
          collections: ['notes'],
          source: 'observed',
        },
        ...Array.from({ length: 25 }, (_, i) => ({
          id: `image-${i}`,
          kind: 'image-created',
          time: '2026-10-17T04:00:00Z',
          entity: `image:${i}`,
          title: `验收配图 ${i}`,
          collections: ['notes'],
          source: 'observed',
        })),
      ],
    };
    await route.fulfill({ response, json: library });
  });
  await page.goto('/');
  await page.getByRole('button', { name: '统计看板', exact: true }).click();
});

test('看板独立地址支持刷新、前后退和直接进入，已移除内容地图', async ({ page }, testInfo) => {
  const dashboard = page.locator('.workbench');
  await expect(page).toHaveURL(/#\/dashboard$/);
  const nav = dashboard.getByRole('navigation', { name: '看板视图' });
  await expect(nav.getByRole('link')).toHaveCount(2);
  await expect(nav.getByRole('link', { name: '内容地图' })).toHaveCount(0);
  await page.reload();
  await expect(dashboard).toBeVisible();
  await expect(nav.getByRole('link', { name: '学习概况', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await nav.getByRole('link', { name: '变更记录', exact: true }).click();
  await expect(page).toHaveURL(/#\/dashboard\/activity$/);
  await page.reload();
  await expect(dashboard).toHaveAttribute('data-dashboard-view', 'activity');
  await page.goBack();
  await expect(dashboard).toHaveAttribute('data-dashboard-view', 'overview');
  await page.goForward();
  await expect(dashboard).toHaveAttribute('data-dashboard-view', 'activity');
  await page.goto('/#/dashboard');
  await expect(dashboard).toHaveAttribute('data-dashboard-view', 'overview');
  await page.screenshot({ path: testInfo.outputPath('overview.png') });
  await dashboard.locator('.db-feature .db-primary').click();
  await expect(page.locator('.document-reader[data-document-id="dashboard-0"]')).toBeVisible();
  await page.goBack();
  await expect(dashboard).toBeVisible();
  await expect(page).toHaveURL(/#\/dashboard$/);
});

test('从正文进入看板并刷新后仍能返回原阅读', async ({ page }) => {
  test.skip(page.viewportSize()!.width <= 900, '手机正文覆盖看板入口，浏览器返回另有覆盖');
  await page.goto('/#/doc/second');
  await expect(page.locator('.document-reader[data-document-id="second"]')).toBeVisible();
  await page.getByRole('button', { name: '统计看板', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: '返回阅读', exact: true }).click();
  await expect(page.locator('.document-reader[data-document-id="second"]')).toBeVisible();
});

test('柱形进入当天记录，月历键盘跨月、筛选与空态', async ({ page }, testInfo) => {
  const dashboard = page.locator('.workbench');
  await dashboard.getByRole('button', { name: '2026-10-16，1 项已知变化，查看明细' }).click();
  await expect(dashboard.getByRole('heading', { name: '2026-10-16' })).toBeVisible();
  await expect(dashboard.locator('.db-event-list')).toContainText('外部资料测试导读');
  const date = dashboard.locator('[data-day="2026-10-16"]');
  await date.focus();
  await date.press('ArrowRight');
  await expect(dashboard.locator('[data-day="2026-10-17"]')).toBeFocused();
  await expect(dashboard.locator('.db-event-list')).toContainText('回归起点');
  await dashboard.getByRole('combobox', { name: '活动', exact: true }).selectOption('created');
  await expect(dashboard.getByRole('heading', { name: '这一天未检测到变化' })).toBeVisible();
  await dashboard.getByRole('combobox', { name: '活动', exact: true }).selectOption('all');
  await dashboard.getByRole('button', { name: '上个月' }).click();
  await expect(dashboard.getByRole('heading', { name: '2026-09-01' })).toBeVisible();
  await dashboard.locator('[data-day="2026-09-01"]').focus();
  await dashboard.locator('[data-day="2026-09-01"]').press('ArrowLeft');
  await expect(dashboard.locator('[data-day="2026-08-31"]')).toBeFocused();
  await expect(dashboard.getByRole('heading', { name: '2026-08-31' })).toBeVisible();
  await dashboard.getByRole('button', { name: '回到今天' }).click();
  await page.screenshot({ path: testInfo.outputPath('activity.png') });
  expect(await dashboard.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
});

test('320px、竖屏与横屏的两个看板视图保持可用', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'narrow', '仅检查手机布局');
  const dashboard = page.locator('.workbench');
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    for (const [view, title] of [
      ['overview', '学习概况'],
      ['activity', '变更记录'],
    ]) {
      await dashboard
        .getByRole('navigation', { name: '看板视图' })
        .getByRole('link', { name: title, exact: true })
        .click();
      await expect(
        dashboard
          .getByRole('navigation', { name: '看板视图' })
          .getByRole('link', { name: title, exact: true }),
      ).toHaveAttribute('aria-current', 'page');
      expect(await dashboard.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      if (view === 'activity') {
        const days = await dashboard.locator('.db-calendar-days button').evaluateAll((buttons) =>
          buttons.map((button) => {
            const box = button.getBoundingClientRect();
            return { left: box.left, right: box.right };
          }),
        );
        expect(days.every((box) => box.left >= 0 && box.right <= viewport.width)).toBe(true);
      }
      await page.screenshot({ path: testInfo.outputPath(`${view}-${viewport.width}.png`) });
    }
  }
});

test('桌面有限高度下少量内容无需整页滚动，冗长记录在列表内滚动', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'wide', '仅检查桌面高度适配');
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    for (const title of ['学习概况', '变更记录']) {
      await page
        .locator('.workbench')
        .getByRole('navigation', { name: '看板视图' })
        .getByRole('link', { name: title, exact: true })
        .click();
      expect(
        await page.locator('.workbench').evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
      ).toBe(true);
      if (title === '变更记录') {
        expect(
          await page.locator('.db-day-panel').evaluate((el) => el.scrollHeight > el.clientHeight),
        ).toBe(true);
      }
      await page.screenshot({ path: testInfo.outputPath(`${title}-${viewport.height}.png`) });
    }
  }
});
