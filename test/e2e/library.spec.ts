import { expect, test, type Page, type Route } from '@playwright/test';

const authEnabled = process.env.FEATURE_AUTH === 'true';
const apiOrigin = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const user = {
  id: 'phase-c-user',
  email: 'phase-c@example.com',
  createdAt: '2026-01-01T00:00:00.000Z',
  settings: {
    dailyNewWordLimit: 5,
    sessionWordCount: 10,
    theme: 'dark',
    language: 'vi',
  },
};

const officialWord = {
  id: 'word-1',
  term: 'ephemeral',
  normalizedTerm: 'ephemeral',
  tags: ['reading'],
  status: 'OFFICIAL',
  content: {
    definition_en: 'Lasting for a very short time.',
    definition_vi: 'Tồn tại trong thời gian rất ngắn.',
    pronunciation: '/ɪˈfem.ər.əl/',
    examples: [{ sentence: 'The beauty was ephemeral.', translation_vi: 'Vẻ đẹp ấy thoáng qua.' }],
  },
  addedAt: '2026-01-01T00:00:00.000Z',
  learningStartedAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  health: { depthLevel: 2, totalAttempts: 7, currentStreak: 3 },
  quizzes: [{ id: 'quiz-1', type: 'DEFINITION_MATCH', difficulty: 2 }],
  shadows: [{ id: 'shadow-1', term: 'fleeting', status: 'SHADOW' }],
};

async function respond(route: Route, data: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({ success: status < 400, ...(status < 400 ? { data } : { error: data }) }),
  });
}

async function mockAuth(page: Page) {
  await page.route(`${apiOrigin}/**`, async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    if (url.includes('/auth/login') && method === 'POST') {
      await respond(route, { accessToken: 'test-token' });
      return;
    }
    if (url.includes('/auth/refresh') && method === 'POST') {
      const cookieHeader = route.request().headers().cookie ?? '';
      if (!cookieHeader.includes('auth_session=')) {
        await respond(route, { code: 'UNAUTHORIZED', message: 'No session' }, 401);
        return;
      }
      await respond(route, { accessToken: 'test-token' });
      return;
    }
    if (url.includes('/users/me') && method === 'GET') {
      await respond(route, user);
      return;
    }
    await route.fallback();
  });
}

async function login(page: Page) {
  await page.goto('/vi/auth/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Mật khẩu').fill('password123');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(/\/vi\/dashboard/);
}

test.describe('phase C word library', () => {
  test.skip(!authEnabled, 'FEATURE_AUTH is disabled');

  test('lists and filters words with URL-backed state', async ({ page }) => {
    await mockAuth(page);
    await page.route(`${apiOrigin}/words**`, async (route) => {
      const url = new URL(route.request().url());
      if (route.request().method() !== 'GET' || url.pathname !== '/words') {
        await route.fallback();
        return;
      }
      const items = url.searchParams.get('q') === 'missing' ? [] : [officialWord];
      await respond(route, {
        items,
        meta: { total: items.length, page: 1, pageSize: 20, totalPages: items.length ? 1 : 0 },
      });
    });
    await login(page);

    await page.goto('/vi/words');
    await expect(page.getByRole('heading', { name: 'Từ của bạn' })).toBeVisible();
    await expect(page.getByText('Tồn tại trong thời gian rất ngắn.')).toBeVisible();
    await page.getByLabel('Tìm từ').fill('missing');
    await page.getByRole('button', { name: 'Áp dụng' }).click();
    await expect(page).toHaveURL(/q=missing/);
    await expect(page.getByText('Không tìm thấy từ phù hợp.')).toBeVisible();
  });

  test('edits detail tags and queues a related shadow', async ({ page }) => {
    await mockAuth(page);
    let currentWord = officialWord;
    await page.route(`${apiOrigin}/words/word-1`, async (route) => {
      if (route.request().method() === 'PATCH') {
        const body = route.request().postDataJSON() as { tags: string[] };
        currentWord = { ...officialWord, tags: body.tags };
        await respond(route, {
          id: currentWord.id,
          term: currentWord.term,
          normalizedTerm: currentWord.normalizedTerm,
          tags: currentWord.tags,
          status: currentWord.status,
          content: currentWord.content,
          addedAt: currentWord.addedAt,
          learningStartedAt: currentWord.learningStartedAt,
          updatedAt: currentWord.updatedAt,
          health: currentWord.health,
        });
        return;
      }
      await respond(route, currentWord);
    });
    await page.route(`${apiOrigin}/queue`, async (route) => {
      await respond(route, {
        added: true,
        item: { id: 'queue-1', priority: 0, addedAt: '2026-01-01T00:00:00.000Z' },
      });
    });
    await login(page);

    await page.goto('/vi/words/word-1');
    await expect(page.getByRole('heading', { name: 'ephemeral', level: 1 })).toBeVisible();
    await page.getByRole('button', { name: 'Sửa tags' }).click();
    await page.getByLabel('Tags, ngăn cách bằng dấu phẩy').fill('reading, work');
    await page.getByRole('button', { name: 'Lưu tags' }).click();
    await expect(page.getByText('work', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Quiz đã chuẩn bị' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Từ liên quan' })).toBeVisible();
    await page.getByRole('button', { name: 'Thêm vào Queue' }).click();
    await expect(page.getByRole('button', { name: 'Đã có trong Queue' })).toBeVisible();
  });

  test('imports a batch and follows durable progress on Dashboard', async ({ page }) => {
    await mockAuth(page);
    let batchReads = 0;
    await page.route(`${apiOrigin}/words/import`, async (route) => {
      await respond(route, {
        batchId: 'batch-1',
        requestedCount: 3,
        accepted: [
          { wordId: 'word-1', term: 'ephemeral', status: 'PENDING' },
          { wordId: 'word-2', term: 'transient', status: 'PENDING' },
        ],
        skipped: [{ term: 'ephemeral', reason: 'DUPLICATE_IN_BATCH' }],
      }, 202);
    });
    await page.route(`${apiOrigin}/words/import/batch-1`, async (route) => {
      batchReads += 1;
      const processing = batchReads === 1;
      await respond(route, {
        batchId: 'batch-1',
        requestedCount: 3,
        acceptedCount: 2,
        pendingCount: processing ? 2 : 0,
        officialCount: processing ? 0 : 2,
        failedCount: 0,
        progress: processing ? 0 : 100,
        status: processing ? 'PROCESSING' : 'COMPLETE',
        words: [],
        skipped: [{ term: 'ephemeral', reason: 'DUPLICATE_IN_BATCH' }],
      });
    });
    await login(page);

    await page.goto('/vi/words/new');
    await page.getByRole('button', { name: 'Thêm nhiều từ cùng lúc? →' }).click();
    await page.getByLabel('Danh sách từ tiếng Anh').fill('ephemeral\ntransient\nephemeral');
    await page.getByRole('button', { name: 'Thêm tất cả →' }).click();
    await expect(page).toHaveURL(/\/vi\/dashboard\?batch=batch-1/);
    await expect(page.getByText('Đã thêm xong 2 từ.')).toBeVisible();
    await expect(page.getByText('Bỏ qua 1 mục trùng hoặc vượt giới hạn.')).toBeVisible();
  });

  test('processes the learning queue', async ({ page }) => {
    await mockAuth(page);
    let queueStatus: 'SHADOW' | 'PENDING' | 'DONE' = 'SHADOW';
    let pendingReads = 0;
    await page.route(`${apiOrigin}/queue**`, async (route) => {
      const url = new URL(route.request().url());
      if (route.request().method() === 'POST' && url.pathname === '/queue/process') {
        queueStatus = 'PENDING';
        await respond(route, {
          accepted: [{ wordId: 'shadow-1', term: 'fleeting', status: 'PENDING' }],
          remainingQueue: 0,
          dailyRemaining: 2,
        }, 202);
        return;
      }
      if (route.request().method() === 'GET' && url.pathname === '/queue') {
        const responseStatus = queueStatus;
        const items = responseStatus !== 'DONE'
          ? [{
              id: 'queue-1',
              priority: 0,
              addedAt: '2026-01-01T00:00:00.000Z',
              word: { id: 'shadow-1', term: 'fleeting', status: responseStatus, content: null, tags: [], health: null },
            }]
          : [];
        if (responseStatus === 'PENDING') {
          pendingReads += 1;
          if (pendingReads >= 2) queueStatus = 'DONE';
        }
        await respond(route, {
          items,
          meta: { total: items.length, page: 1, pageSize: 20, totalPages: items.length ? 1 : 0 },
          summary: { count: items.length, warningThreshold: 50, maxSize: 100 },
        });
        return;
      }
      await route.fallback();
    });
    await login(page);

    await page.goto('/vi/queue');
    await expect(page.getByText('fleeting', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Bắt đầu học' }).click();
    await expect(page.getByText('Đã nhận 1 từ · còn 2 slot hôm nay.')).toBeVisible();
    await expect(page.getByText('Đang tạo', { exact: true })).toBeVisible();
    await expect(page.getByText('Queue đang trống.')).toBeVisible({ timeout: 5000 });
  });

  test('deletes a failed word from its detail page', async ({ page }) => {
    await mockAuth(page);
    let deleted = false;
    const failedWord = {
      ...officialWord,
      id: 'failed-word',
      status: 'FAILED',
      content: null,
    };
    await page.route(`${apiOrigin}/words**`, async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === '/words/failed-word' && route.request().method() === 'GET') {
        await respond(route, failedWord);
        return;
      }
      if (url.pathname === '/words/failed-word' && route.request().method() === 'DELETE') {
        deleted = true;
        await respond(route, { deleted: true });
        return;
      }
      if (url.pathname === '/words' && route.request().method() === 'GET') {
        await respond(route, {
          items: [],
          meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
        });
        return;
      }
      await route.fallback();
    });
    await login(page);

    await page.goto('/vi/words/failed-word');
    await expect(page.getByRole('heading', { name: 'Không thể tạo tài liệu' })).toBeVisible();
    await page.getByRole('button', { name: 'Xóa từ' }).click();
    await page.getByRole('button', { name: 'Xóa', exact: true }).click();

    await expect(page).toHaveURL(/\/vi\/words$/);
    expect(deleted).toBe(true);
  });
});
