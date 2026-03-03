/**
 * E2E 测试辅助函数
 *
 * 提供跨测试文件的通用工具函数，避免重复代码。
 */

import { Page } from '@playwright/test';

/**
 * 登录辅助函数 - 处理密码修改页面场景
 *
 * 这个函数设计用于处理两种场景：
 * 1. 正常登录 - 登录后直接跳转到 Dashboard (/)
 * 2. 强制密码修改 - 登录后跳转到 /change-password（默认密码场景）
 *
 * 当 RUST_DNS__AUTH__ALLOW_DEFAULT_PASSWORD=true 时，默认密码不会触发修改流程。
 * 当设置为 false 时，使用默认密码会被强制修改密码。
 *
 * @param page Playwright Page 对象
 * @param username 用户名
 * @param password 密码
 * @returns Promise<void>
 */
export async function login(page: Page, username: string, password: string): Promise<void> {
  // 导航到登录页
  await page.goto('/login');

  // 等待表单加载完成
  await page.waitForSelector('input[id="username"]', { timeout: 10000 });

  // 填写登录表单
  await page.fill('input[id="username"]', username);
  await page.fill('input[id="password"]', password);
  await page.click('button[type="submit"]');

  // 等待导航 - 使用较短超时后直接检查 URL
  // 不等待 networkidle，因为在 CI 环境中可能很慢
  await page.waitForTimeout(5000);

  // 检查当前 URL
  let currentUrl = page.url();
  let attempts = 0;
  const maxAttempts = 3;

  // 如果仍在登录页，可能是登录失败或网络问题
  // 尝试重试登录
  while (currentUrl.includes('/login') && attempts < maxAttempts) {
    attempts++;
    // 如果不是第一次尝试，需要重新填写表单
    if (attempts > 1) {
      await page.fill('input[id="username"]', username);
      await page.fill('input[id="password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
    }

    currentUrl = page.url();

    // 如果已经不在登录页了，跳出循环
    if (!currentUrl.includes('/login')) {
      break;
    }
  }

  // 检查是否被重定向到修改密码页面
  if (currentUrl.includes('/change-password')) {
    // 填写修改密码表单
    await page.fill('input[id="current-password"]', password);
    await page.fill('input[id="new-password"]', 'Test123456');
    await page.fill('input[id="confirm-password"]', 'Test123456');
    await page.click('button[type="submit"]');

    // 等待重定向完成
    await page.waitForTimeout(5000);

    const finalUrl = await page.evaluate(() => window.location.href);
    if (finalUrl !== '/' && !finalUrl.endsWith('/')) {
      // 如果不在首页，尝试等待导航
      await page.waitForURL('/', { timeout: 10000 }).catch(() => {
        // 导航超时，继续执行
      });
    }
  }
}

/**
 * 清除浏览器状态（cookies 和 localStorage）
 *
 * 用于 beforeEach 或需要重置登录状态的场景。
 *
 * @param page Playwright Page 对象
 * @returns Promise<void>
 */
export async function clearBrowserState(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.addInitScript(() => {
    localStorage.clear();
  });
}
