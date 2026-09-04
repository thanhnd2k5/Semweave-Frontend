import { expect, test, type Page, type Route } from '@playwright/test';

const authEnabled = process.env.FEATURE_AUTH === 'true';
const apiOrigin = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const user = {
  id: 'dashboard-user',
  email: 'dashboard@example.com',
  createdAt: '2026-01-01T00:00:00.000Z',
  settings: {
    dailyNewWordLimit: 3,
    sessionWordCount: 10,
    theme: 'dark',
    language: 'vi',
  },
};

const sessionId = 'session-due-1';
const word = {
  id: 'word-due',
  term: 'ephemeral',
};

type StatsOverrides = {
  dueTodayCount?: number;
  nextDueAt?: string | null;
  totalLearningWords?: number;
  queueCount?: number;
  graduatedCount?: number;
};

function sessionStats(overrides: StatsOverrides = {}) {
  return {
    asOf: '2026-09-04T12:00:00.000Z',
    dueTodayCount: 0,
    nextDueAt: null,
    totalLearningWords: 0,
    queueCount: 0,
    graduatedCount: 0,
    sessionWordCount: 10,
    dailyNewWordLimit: { limit: 3, used: 0, remaining: 3 },
    ...overrides,
  };
}

function dueBundle(clientSessionId: string) {
  return {
    id: sessionId,
    clientSessionId,
    type: 'DUE_TODAY',
    status: 'IN_PROGRESS',
    startedAt: '2026-09-04T12:00:00.000Z',
    totalWords: 1,
    totalQuestions: 1,
    questions: [
      {
        id: 'q1',
        position: 0,
        word: { id: word.id, term: word.term, depthLevel: 1 },
        type: 'DEFINITION_MATCH',
        question: 'Lasting for a very short time',
        contextLabel: null,
        options: [
          { id: 'option_a', text: 'lasting' },
          { id: 'option_b', text: 'ephemeral' },
          { id: 'option_c', text: 'heavy' },
          { id: 'option_d', text: 'ancient' },
        ],
        correctAnswer: 'ephemeral',
        acceptedVariants: [],
        explanation: 'It means short-lived.',
        difficulty: 1,
        gradingVersion: 1,
      },
    ],
  };
}

function dueSummary() {
  return {
    sessionId,
    type: 'DUE_TODAY',
    status: 'COMPLETED',
    totalWords: 1,
    totalQuestions: 1,
    answeredCount: 1,
    correctCount: 1,
    accuracy: 1,
    avgResponseTimeMs: 900,
    durationMs: 4000,
    improvedWords: [
      {
        wordId: word.id,
        term: word.term,
        levelBefore: 1,
        levelAfter: 1,
        nextReviewAt: '2026-09-05T12:00:00.000Z',
      },
    ],
    reviewWords: [],
    leveledUpWords: [],
    skippedAttempts: [],
    nextDueAt: '2026-09-05T12:00:00.000Z',
    syncedAt: '2026-09-04T12:10:00.000Z',
  };
}

async function respond(route: Route, data: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({ success: status < 400, ...(status < 400 ? { data } : { error: data }) }),
  });
}

async function mockDashboardApi(
  page: Page,
  options: {
    stats?: ReturnType<typeof sessionStats> | (() => ReturnType<typeof sessionStats>);
    failStatsOnce?: boolean;
    allowCreateSession?: boolean;
  } = {},
) {
  const created: Array<{ type?: string }> = [];
  let statsFailed = options.failStatsOnce === true;

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
    if (url.includes('/sessions/stats') && method === 'GET') {
      if (statsFailed) {
        statsFailed = false;
        await respond(route, { code: 'INTERNAL_ERROR', message: 'Stats unavailable' }, 500);
        return;
      }
      const stats = typeof options.stats === 'function' ? options.stats() : (options.stats ?? sessionStats());
      await respond(route, stats);
      return;
    }
    if (url.endsWith('/sessions') && method === 'POST') {
      const body = route.request().postDataJSON() as { clientSessionId: string; type?: string };
      created.push(body);
      if (!options.allowCreateSession) {
        await respond(route, { code: 'SESSION_EMPTY', message: 'No words due' }, 409);
        return;
      }
      await respond(route, dueBundle(body.clientSessionId));
      return;
    }
    if (url.includes(`/sessions/${sessionId}/complete`) && method === 'POST') {
      await respond(route, dueSummary());
      return;
    }
    if (url.includes(`/sessions/${sessionId}`) && method === 'GET') {
      await respond(route, dueBundle('11111111-1111-4111-8111-111111111111'));
      return;
    }
    await route.fallback();
  });

  return created;
}

async function login(page: Page) {
  await page.goto('/vi/auth/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Mật khẩu').fill('password123');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(/\/vi\/dashboard/);
}

test.describe('M3-G dashboard', () => {
  test.skip(!authEnabled, 'FEATURE_AUTH is disabled');

  test('shows a new-user CTA instead of a dead review button', async ({ page }) => {
    await mockDashboardApi(page);
    await login(page);

    await expect(page.getByRole('heading', { name: 'Bảng điều khiển' })).toBeVisible();
    await expect(page.getByText('Thêm từ đầu tiên để bắt đầu')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Thêm từ →' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Bắt đầu ôn →' })).toHaveCount(0);
    await expect(page.getByText('Word Map')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Thư viện từ' })).toBeVisible();

    await page.getByRole('button', { name: 'Thêm từ →' }).click();
    await expect(page).toHaveURL(/\/vi\/words\/new/);
  });

  test('does not create a session when nothing is due', async ({ page }) => {
    const created = await mockDashboardApi(page, {
      stats: sessionStats({
        dueTodayCount: 0,
        totalLearningWords: 6,
        nextDueAt: '2026-09-05T15:00:00.000Z',
      }),
    });
    await login(page);

    await expect(page.getByText('Bạn đã ôn hết hôm nay!')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bắt đầu ôn →' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Thêm từ' })).toBeVisible();
    expect(created).toHaveLength(0);
  });

  test('retries stats without blocking navigation', async ({ page }) => {
    await mockDashboardApi(page, {
      stats: sessionStats({ totalLearningWords: 4, dueTodayCount: 0 }),
      failStatsOnce: true,
    });
    await login(page);

    await expect(page.getByText('Không tải được dữ liệu')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Thư viện từ' })).toBeVisible();
    await page.getByRole('button', { name: 'Thử lại' }).click();
    await expect(page.getByText('Bạn đã ôn hết hôm nay!')).toBeVisible();
  });

  test('starts Due Today from the primary CTA and returns to an updated dashboard', async ({
    page,
  }) => {
    let dueTodayCount = 2;
    const created = await mockDashboardApi(page, {
      stats: () =>
        sessionStats({
          dueTodayCount,
          totalLearningWords: 8,
          queueCount: 3,
          graduatedCount: 1,
          nextDueAt: dueTodayCount === 0 ? '2026-09-05T12:00:00.000Z' : null,
        }),
      allowCreateSession: true,
    });
    await login(page);

    await expect(page.getByText('2 từ cần ôn hôm nay')).toBeVisible();
    await page.getByRole('button', { name: 'Bắt đầu ôn →' }).click();

    await expect(page).toHaveURL(new RegExp(`/vi/study/${sessionId}`));
    expect(created).toEqual([expect.objectContaining({ type: 'DUE_TODAY' })]);

    await page.getByRole('radio', { name: /ephemeral/ }).click({ force: true });
    await expect(page.getByTestId('quiz-feedback')).toBeVisible();
    await page.getByRole('button', { name: 'Xem kết quả →' }).click();
    await expect(page.getByRole('heading', { name: 'Session hoàn thành!' })).toBeVisible();

    dueTodayCount = 0;
    await page.getByRole('button', { name: 'Home' }).click();
    await expect(page).toHaveURL(/\/vi\/dashboard/);
    await expect(page.getByText('Bạn đã ôn hết hôm nay!')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bắt đầu ôn →' })).toHaveCount(0);
  });
});
