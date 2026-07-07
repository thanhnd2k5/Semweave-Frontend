import { test, expect } from '@playwright/test';

test.describe('core', () => {
  test('home page loads with app info', async ({ page }) => {
    await page.goto('/vi');

    await expect(page.getByRole('heading', { name: 'nextjs-starter-tailwind' })).toBeVisible();
    await expect(page.getByText('Frontend base')).toBeVisible();
  });

  test('locale switch via URL', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByText('Frontend base with optional auth')).toBeVisible();
  });

  test('theme toggle in header persists across reload', async ({ page }) => {
    await page.goto('/vi');

    await page.getByRole('button', { name: 'Sáng' }).click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    await page.reload();
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    await page.getByRole('button', { name: 'Tối' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });
});
