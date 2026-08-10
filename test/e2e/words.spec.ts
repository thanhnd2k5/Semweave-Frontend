import { test, expect, type Page } from '@playwright/test';

const authEnabled = process.env.FEATURE_AUTH === 'true';
const apiOrigin = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const user = {
  id: 'user-1',
  email: 'words@example.com',
  createdAt: '2026-01-01T00:00:00.000Z',
  settings: {
    dailyNewWordLimit: 3,
    sessionWordCount: 10,
    theme: 'dark',
    language: 'vi',
  },
};

const officialWord = {
  id: 'word-1',
  term: 'ephemeral',
  normalizedTerm: 'ephemeral',
  tags: [],
  status: 'OFFICIAL',
  content: {
    definition_en: 'Lasting for a very short time.',
    definition_vi: 'Tồn tại trong thời gian rất ngắn.',
    pronunciation: '/ɪˈfem.ər.əl/',
    examples: [{ sentence: 'The beauty was ephemeral.', translation_vi: 'Vẻ đẹp đó thoáng qua.' }],
  },
  addedAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  health: { depthLevel: 2, totalAttempts: 7, currentStreak: 3 },
  shadows: [{ id: 'shadow-1', term: 'fleeting', status: 'SHADOW' }],
};

type Scenario = 'success' | 'ambiguous' | 'duplicate' | 'limit';

async function mockApi(page: Page, scenario: Scenario) {
  let detailReads = 0;

  await page.route(`${apiOrigin}/**`, async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    const respond = async (data: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ success: status < 400, ...(status < 400 ? { data } : { error: data }) }),
      });

    if (url.includes('/auth/login') && method === 'POST') {
      await respond({ accessToken: 'test-token' });
      return;
    }
    if (url.includes('/auth/refresh') && method === 'POST') {
      await respond({ accessToken: 'test-token' });
      return;
    }
    if (url.includes('/users/me') && method === 'GET') {
      await respond(user);
      return;
    }
    if (url.includes('/words/check-duplicate') && method === 'GET') {
      await respond(scenario === 'duplicate' ? { exists: true, word: officialWord } : { exists: false });
      return;
    }
    if (url.includes('/words/detect-ambiguity') && method === 'POST') {
      await respond(
        scenario === 'ambiguous'
          ? {
              ambiguous: true,
              question: 'Bạn muốn học nghĩa nào của "set"?',
              senses: [{ label: 'Đặt', description: 'Đặt hoặc để một vật' }],
            }
          : { ambiguous: false },
      );
      return;
    }
    if (url.endsWith('/words') && method === 'POST') {
      if (scenario === 'limit') {
        await respond(
          { code: 'DAILY_LIMIT_EXCEEDED', message: 'Limit reached', details: { limit: 3 } },
          429,
        );
        return;
      }
      await respond({ wordId: officialWord.id, status: 'PENDING' }, 202);
      return;
    }
    if (url.includes(`/words/${officialWord.id}`) && method === 'GET') {
      detailReads += 1;
      await respond(detailReads === 1 ? { ...officialWord, status: 'PENDING', content: null } : officialWord);
      return;
    }

    await route.continue();
  });
}

async function loginAndOpenWords(page: Page, scenario: Scenario) {
  await mockApi(page, scenario);
  await page.goto('/vi/auth/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Mật khẩu').fill('password123');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(/\/vi\/dashboard/);
  await page.goto('/vi/words/new');
  await expect(page.getByRole('heading', { name: 'Thêm từ mới' })).toBeVisible();
}

test.describe('words', () => {
  test.skip(!authEnabled, 'FEATURE_AUTH is disabled');

  test('creates a clear word and previews the generated package', async ({ page }) => {
    await loginAndOpenWords(page, 'success');
    await page.getByLabel('Từ tiếng Anh').fill('ephemeral');
    await page.getByRole('button', { name: 'Thêm →' }).click();

    await expect(page.getByText('🤖 AI đang chuẩn bị tài liệu cho \'ephemeral\'')).toBeVisible();
    await expect(page.getByRole('heading', { name: '✅ \'ephemeral\' đã sẵn sàng!' })).toBeVisible();
    await expect(page.getByText('Tồn tại trong thời gian rất ngắn.')).toBeVisible();
    await expect(page.getByText('fleeting')).toBeVisible();
  });

  test('asks for clarification only for an ambiguous word', async ({ page }) => {
    await loginAndOpenWords(page, 'ambiguous');
    await page.getByLabel('Từ tiếng Anh').fill('set');
    await page.getByRole('button', { name: 'Thêm →' }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('radio', { name: /Đặt/ }).check();
    await page.getByRole('button', { name: 'Tiếp tục →' }).click();
    await expect(page.getByRole('heading', { name: '✅ \'set\' đã sẵn sàng!' })).toBeVisible();
  });

  test('treats a duplicate as a review opportunity', async ({ page }) => {
    await loginAndOpenWords(page, 'duplicate');
    await page.getByLabel('Từ tiếng Anh').fill('ephemeral');
    await page.getByRole('button', { name: 'Thêm →' }).click();

    await expect(page.getByText('Ôn 7 lần · Streak 3')).toBeVisible();
    await page.getByRole('button', { name: 'Xem lại từ này' }).click();
    await expect(page.getByRole('heading', { name: '✅ \'ephemeral\' đã sẵn sàng!' })).toBeVisible();
  });

  test('shows daily limit as a neutral boundary', async ({ page }) => {
    await loginAndOpenWords(page, 'limit');
    await page.getByLabel('Từ tiếng Anh').fill('ephemeral');
    await page.getByRole('button', { name: 'Thêm →' }).click();

    await expect(page.getByText('Đã đạt giới hạn 3 từ/ngày hôm nay — quay lại vào ngày mai 🌙')).toBeVisible();
  });
});
