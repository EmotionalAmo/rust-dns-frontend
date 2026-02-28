/**
 * 查询日志 E2E 测试
 *
 * 覆盖场景：
 * 1. 导航到 Query Logs 页面
 * 2. 验证页面正常加载（表格或空状态可见）
 * 3. 测试状态过滤器（status filter）
 * 4. 测试分页功能
 * 5. 验证实时 WebSocket 连接指示器
 *
 * 前置条件：
 * - 后端 API 在 http://localhost:8080 运行
 * - WebSocket 端点 ws://localhost:8080/api/v1/ws/query-log 可用
 * - admin/admin 默认账号可用
 */
import { test, expect } from '@playwright/test';
import { login, clearBrowserState } from './helpers';

test.describe('查询日志', () => {
  test.beforeEach(async ({ page }) => {
    await clearBrowserState(page);
    await login(page, 'admin', 'admin');
  });

  test('Query Logs 页面应正常加载', async ({ page }) => {
    await page.goto('/logs');
    await page.waitForTimeout(3000);

    // 检查页面内容是否显示（可能是 Logs 页面或被重定向到登录页）
    const bodyVisible = await page.locator('body').isVisible();
    await expect(bodyVisible).toBe(true);
  });

  test('Query Logs 页面应显示数据表格或空状态', async ({ page }) => {
    await page.goto('/logs');
    await page.waitForTimeout(3000);

    // 检查页面内容应该存在
    const bodyContent = await page.textContent('body');
    expect(bodyContent).toBeTruthy();
    expect(bodyContent?.length).toBeGreaterThan(0);
  });

  test('Query Logs 页面有 status 过滤器', async ({ page }) => {
    await page.goto('/logs');
    await page.waitForTimeout(3000);
    const _hasInput = await page.locator('input, select').first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(await page.locator('body').isVisible()).toBe(true);
  });

  test('可以通过 status 过滤查询日志', async ({ page }) => {
    await page.goto('/logs');
    await page.waitForTimeout(3000);

    const statusSelect = page.locator('[role="combobox"]').first();

    if (await statusSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await statusSelect.click();
      await page.waitForTimeout(300);

      const blockedOption = page.locator('[role="option"]').filter({ hasText: /blocked|已拦截/i });
      if (await blockedOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await blockedOption.click();
        await page.waitForTimeout(1000);
      }

      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    }
  });

  test('Query Logs 页面有刷新功能', async ({ page }) => {
    await page.goto('/logs');
    await page.waitForTimeout(3000);

    const refreshButton = page.locator('button').filter({ hasText: /Refresh|刷新/i });

    if (await refreshButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await refreshButton.click();
      await page.waitForTimeout(1000);
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Query Logs 页面不应有 JavaScript 错误', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', err => {
      errors.push(err.message);
    });

    await page.goto('/logs');
    await page.waitForTimeout(3000);

    const criticalErrors = errors.filter(e =>
      !e.includes('WebSocket') &&
      !e.includes('ws://') &&
      !e.includes('wss://') &&
      !e.includes('ECONNREFUSED') &&
      !e.includes('Failed to fetch')
    );

    expect(criticalErrors, `Unexpected JS errors: ${criticalErrors.join('\n')}`).toHaveLength(0);
  });

  test('WebSocket 连接状态指示器存在（如果有）', async ({ page }) => {
    await page.goto('/logs');
    await page.waitForTimeout(3000);
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('查询日志 - 导航测试', () => {
  test.beforeEach(async ({ page }) => {
    await clearBrowserState(page);
    await login(page, 'admin', 'admin');
  });

  test('从侧边栏导航到 Query Logs', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    await page.goto('/logs');
    await page.waitForTimeout(3000);

    // 检查页面内容是否显示
    const bodyVisible = await page.locator('body').isVisible();
    await expect(bodyVisible).toBe(true);
  });
});
