import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.mjs',
  fullyParallel: false,
  workers: 1,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1',
    cwd: repoRoot,
    url: 'http://127.0.0.1:4173/reading/',
    reuseExistingServer: false,
    timeout: 15_000
  },
  projects: [
    { name: 'phone-320', use: { viewport: { width: 320, height: 700 } } },
    { name: 'phone-360', use: { viewport: { width: 360, height: 780 } } },
    { name: 'phone-412', use: { viewport: { width: 412, height: 915 } } }
  ]
});
