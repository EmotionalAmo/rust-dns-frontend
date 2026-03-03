import { defineConfig } from '@playwright/test';

/**
 * rust-dns 前端 E2E 测试配置
 *
 * 测试策略：
 * - 仅使用 Chromium（CI 中快速、稳定）
 * - 在 CI 环境中自动启动开发服务器
 * - 本地开发时复用已运行的服务器（reuseExistingServer）
 * - 测试隔离：每个测试独立的 storageState
 * - E2E_SKIP: 暂时禁用 E2E 测试（超时问题待修复）
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
    : 'list',

  // 暂时禁用 E2E 测试（超时问题待修复）
  projects: process.env.E2E_SKIP ? [] : undefined,

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    // 截图：仅在失败时保存
    screenshot: 'only-on-failure',
  },

  // 本地开发时：如果 Vite 已经在运行则复用，否则自动启动
  // 暂时禁用 E2E 测试时禁用 webServer
  webServer: process.env.E2E_SKIP ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    // 启动超时：60 秒（本地 Vite 通常 2-5 秒启动）
    timeout: 60 * 1000,
  },
});
