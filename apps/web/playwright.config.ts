import { e2eURL } from './scripts/e2e-settings.ts';
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 90000,
  expect: { timeout: 15000 },
  use: { baseURL: e2eURL, browserName: 'chromium', trace: 'retain-on-failure' },
  projects: [
    { name: 'wide', use: { viewport: { width: 1440, height: 960 } } },
    { name: 'narrow', use: { viewport: { width: 390, height: 844 } } },
    { name: 'reduced', use: { viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' } },
  ],
  webServer: {
    command: 'node --import tsx scripts/e2e-server.ts',
    url: e2eURL,
    reuseExistingServer: false,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5000 },
    timeout: 120000,
  },
});
