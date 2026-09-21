import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: ['admin.browser.spec.ts', 'tracking.browser.spec.ts'], fullyParallel: false, workers: 1,
  use: { baseURL: 'http://127.0.0.1:3106/etandoori', trace: 'retain-on-failure', ...devices['Desktop Chrome'], viewport: { width: 1180, height: 820 } },
  webServer: { command: 'npm run start -- --port 3106', url: 'http://127.0.0.1:3106/etandoori/admin/login/', reuseExistingServer: false, timeout: 60000 },
});
