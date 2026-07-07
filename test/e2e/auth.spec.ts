import { test, expect } from '@playwright/test';

const authEnabled = process.env.FEATURE_AUTH === 'true';
const apiOrigin = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function mockAuthApi(page: import('@playwright/test').Page) {
  const user = {
    id: 'user-1',
    email: 'test@example.com',
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  return page.route(`${apiOrigin}/**`, async (route) => {
    const url = route.request().url();

    if (url.includes('/auth/login') && route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { accessToken: 'test-token' } }),
      });
      return;
    }

    if (url.includes('/auth/refresh') && route.request().method() === 'POST') {
      const cookieHeader = route.request().headers()['cookie'] ?? '';
      if (!cookieHeader.includes('auth_session=')) {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'No session' },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { accessToken: 'test-token' } }),
      });
      return;
    }

    if (url.includes('/users/me') && route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: user }),
      });
      return;
    }

    await route.continue();
  });
}

test.describe('auth', () => {
  test.skip(!authEnabled, 'FEATURE_AUTH is disabled');

  test('login page renders', async ({ page }) => {
    await page.goto('/vi/auth/login');
    await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Mật khẩu')).toBeVisible();
  });

  test('register page renders', async ({ page }) => {
    await page.goto('/vi/auth/register');
    await expect(page.getByRole('heading', { name: 'Đăng ký' })).toBeVisible();
  });

  test('protected route redirects to login without session', async ({ page }) => {
    await page.goto('/vi/dashboard');
    await expect(page).toHaveURL(/\/vi\/auth\/login/);
    await expect(page.url()).toContain('from=');
  });

  test('login redirects to dashboard with session cookie', async ({ page }) => {
    await page.context().clearCookies();
    await mockAuthApi(page);
    await page.goto('/vi/auth/login');

    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Mật khẩu').fill('password123');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();

    await expect(page).toHaveURL(/\/vi\/dashboard/);

    const cookies = await page.context().cookies();
    expect(cookies.some((c) => c.name === 'auth_session')).toBe(true);
  });

  test('session persists after page reload', async ({ page }) => {
    await page.context().clearCookies();
    await mockAuthApi(page);
    await page.goto('/vi/auth/login');

    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Mật khẩu').fill('password123');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();

    await expect(page).toHaveURL(/\/vi\/dashboard/);

    await page.reload();

    await expect(page).toHaveURL(/\/vi\/dashboard/);
    await expect(page.getByRole('heading', { name: 'Bảng điều khiển' })).toBeVisible();
  });
});
