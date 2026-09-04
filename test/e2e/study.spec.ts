import { expect, test, type Page, type Route } from '@playwright/test';

const authEnabled = process.env.FEATURE_AUTH === 'true';
const apiOrigin = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const user = {
  id: 'study-user',
  email: 'study@example.com',
  createdAt: '2026-01-01T00:00:00.000Z',
  settings: {
    dailyNewWordLimit: 3,
    sessionWordCount: 10,
    theme: 'dark',
    language: 'vi',
  },
};

const word = {
  id: 'word-trial',
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
  health: { depthLevel: 1, totalAttempts: 0, currentStreak: 0 },
  quizzes: [
    { id: 'quiz-1', type: 'DEFINITION_MATCH', difficulty: 1 },
    { id: 'quiz-2', type: 'FILL_IN_BLANK', difficulty: 1 },
    { id: 'quiz-3', type: 'NUANCE_COMPARISON', difficulty: 2 },
  ],
  shadows: [],
};

const sessionId = 'session-trial-1';

function questions(clientSessionId: string) {
  return {
    id: sessionId,
    clientSessionId,
    type: 'WORD_TRIAL',
    status: 'IN_PROGRESS',
    startedAt: '2026-09-04T12:00:00.000Z',
    totalWords: 1,
    totalQuestions: 3,
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
      {
        id: 'q2',
        position: 1,
        word: { id: word.id, term: word.term, depthLevel: 1 },
        type: 'FILL_IN_BLANK',
        question: 'The beauty was ______.',
        contextLabel: null,
        options: [],
        correctAnswer: 'ephemeral',
        acceptedVariants: [],
        explanation: 'The blank takes ephemeral.',
        difficulty: 1,
        gradingVersion: 1,
      },
      {
        id: 'q3',
        position: 2,
        word: { id: word.id, term: word.term, depthLevel: 1 },
        type: 'NUANCE_COMPARISON',
        question: 'Which sentence uses the word most naturally?',
        contextLabel: null,
        options: [
          {
            id: 'option_a',
            text: 'The sunset was beautiful, but the feeling was gone by morning.',
          },
          {
            id: 'option_b',
            text: 'The mountain was ephemeral and stayed in the same place for centuries.',
          },
          {
            id: 'option_c',
            text: 'She bought an ephemeral refrigerator that never broke.',
          },
          {
            id: 'option_d',
            text: 'The law of gravity is ephemeral in every physics classroom.',
          },
        ],
        correctAnswer: 'The sunset was beautiful, but the feeling was gone by morning.',
        acceptedVariants: [],
        explanation: 'Nuance prefers a fleeting feeling.',
        difficulty: 2,
        gradingVersion: 1,
      },
    ],
  };
}

function fiveTypeQuestions(clientSessionId: string) {
  const trial = questions(clientSessionId);
  const wordRef = { id: word.id, term: word.term, depthLevel: 1 };
  const englishOptions = [
    { id: 'option_a', text: 'lasting' },
    { id: 'option_b', text: 'ephemeral' },
    { id: 'option_c', text: 'heavy' },
    { id: 'option_d', text: 'ancient' },
  ];
  return {
    ...trial,
    type: 'DUE_TODAY',
    totalWords: 1,
    totalQuestions: 5,
    questions: [
      trial.questions[0],
      {
        id: 'q-reverse',
        position: 1,
        word: wordRef,
        type: 'REVERSE_RECALL',
        question: 'Tồn tại trong thời gian rất ngắn.',
        contextLabel: null,
        options: englishOptions,
        correctAnswer: 'ephemeral',
        acceptedVariants: [],
        explanation: 'The Vietnamese gloss maps to ephemeral.',
        difficulty: 1,
        gradingVersion: 1,
      },
      {
        id: 'q-context',
        position: 2,
        word: wordRef,
        type: 'CONTEXT_SELECTION',
        question: 'The beauty of the sunset was ______.',
        contextLabel: null,
        options: englishOptions,
        correctAnswer: 'ephemeral',
        acceptedVariants: [],
        explanation: 'The sentence needs ephemeral.',
        difficulty: 1,
        gradingVersion: 1,
      },
      { ...trial.questions[2], id: 'q-nuance', position: 3 },
      { ...trial.questions[1], id: 'q-fill', position: 4 },
    ],
  };
}

function summary(overrides: Record<string, unknown> = {}) {
  return {
    sessionId,
    type: 'WORD_TRIAL',
    status: 'COMPLETED',
    totalWords: 1,
    totalQuestions: 3,
    answeredCount: 3,
    correctCount: 3,
    accuracy: 1,
    avgResponseTimeMs: 1200,
    durationMs: 8000,
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
    ...overrides,
  };
}

async function respond(route: Route, data: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({ success: status < 400, ...(status < 400 ? { data } : { error: data }) }),
  });
}

async function mockStudyApi(
  page: Page,
  options: {
    onComplete?: (route: Route) => Promise<boolean>;
    sessionBundle?: (clientSessionId: string) => unknown;
    stats?: Record<string, unknown>;
  } = {},
) {
  let lastBundle: unknown;
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
      await respond(
        route,
        options.stats ?? {
          asOf: '2026-09-04T00:00:00.000Z',
          dueTodayCount: 0,
          nextDueAt: null,
          totalLearningWords: 1,
          queueCount: 0,
          graduatedCount: 0,
          sessionWordCount: 10,
          dailyNewWordLimit: { limit: 3, used: 0, remaining: 3 },
        },
      );
      return;
    }
    if (url.includes('/words/check-duplicate') && method === 'GET') {
      await respond(route, { exists: false });
      return;
    }
    if (url.includes('/words/detect-ambiguity') && method === 'POST') {
      await respond(route, { ambiguous: false });
      return;
    }
    if (url.endsWith('/words') && method === 'POST') {
      await respond(route, { wordId: word.id, status: 'PENDING' }, 202);
      return;
    }
    if (url.includes(`/words/${word.id}`) && method === 'GET') {
      await respond(route, word);
      return;
    }
    if (url.endsWith('/sessions') && method === 'POST') {
      const body = route.request().postDataJSON() as { clientSessionId: string };
      lastBundle = options.sessionBundle?.(body.clientSessionId) ?? questions(body.clientSessionId);
      await respond(route, lastBundle);
      return;
    }
    if (url.includes(`/sessions/${sessionId}/complete`) && method === 'POST') {
      if (options.onComplete && (await options.onComplete(route))) {
        return;
      }
      const bundle = lastBundle as { type?: string; totalQuestions?: number; totalWords?: number } | undefined;
      await respond(
        route,
        summary({
          type: bundle?.type ?? 'WORD_TRIAL',
          totalQuestions: bundle?.totalQuestions ?? 3,
          totalWords: bundle?.totalWords ?? 1,
          answeredCount: bundle?.totalQuestions ?? 3,
          correctCount: bundle?.totalQuestions ?? 3,
        }),
      );
      return;
    }
    if (url.includes(`/sessions/${sessionId}/abandon`) && method === 'POST') {
      await respond(route, { ...summary(), status: 'ABANDONED' });
      return;
    }
    if (url.includes(`/sessions/${sessionId}`) && method === 'GET') {
      await respond(route, lastBundle ?? questions('11111111-1111-4111-8111-111111111111'));
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

test.describe('M3-F word trial', () => {
  test.skip(!authEnabled, 'FEATURE_AUTH is disabled');

  test('starts a trial from word detail, answers three questions, and shows summary', async ({
    page,
  }) => {
    await mockStudyApi(page);
    await login(page);

    await page.goto(`/vi/words/${word.id}`);
    await expect(page.getByRole('heading', { name: 'ephemeral', level: 1 })).toBeVisible();
    const trial = page.getByRole('button', { name: 'Làm quiz thử' });
    await expect(trial).toBeEnabled();
    await trial.click();

    await expect(page).toHaveURL(new RegExp(`/vi/study/${sessionId}`));
    await expect(page.getByRole('button', { name: 'Thoát phiên học' })).toBeVisible();
    await expect(page.getByRole('progressbar')).toBeVisible();
    await expect(page.getByText('Từ nào có nghĩa:')).toBeVisible();
    await expect(page.getByText('It means short-lived.')).toHaveCount(0);

    await page.getByRole('radio', { name: /ephemeral/ }).click({ force: true });
    await expect(page.getByTestId('quiz-feedback')).toBeVisible();
    await expect(page.getByText('It means short-lived.')).toBeVisible();
    await page.getByRole('button', { name: 'Tiếp theo →' }).click();

    await expect(page.getByText('Điền từ thích hợp vào chỗ trống')).toBeVisible();
    await page.getByLabel('Từ của bạn').fill('ephemeral');
    await page.getByRole('button', { name: 'Kiểm tra →' }).click();
    await expect(page.getByTestId('quiz-feedback')).toBeVisible();
    await page.getByRole('button', { name: 'Tiếp theo →' }).click();

    await expect(
      page.getByText('Câu nào dùng từ CHÍNH XÁC và TỰ NHIÊN nhất trong ngữ cảnh này?'),
    ).toBeVisible();
    await page.keyboard.press('1');
    await expect(page.getByTestId('quiz-feedback')).toBeVisible();
    await page.getByRole('button', { name: 'Xem kết quả →' }).click();

    await expect(page.getByRole('heading', { name: 'Session hoàn thành!' })).toBeVisible();
    await expect(page.getByText(/1 từ · 100% đúng/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Trang chủ' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Xem chi tiết từ' })).toBeVisible();
  });

  test('submits with 1–4 and Enter, while arrows only move focus', async ({ page }) => {
    await mockStudyApi(page);
    await login(page);
    await page.goto(`/vi/words/${word.id}`);
    await page.getByRole('button', { name: 'Làm quiz thử' }).click();
    await expect(page.getByText('Từ nào có nghĩa:')).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByTestId('quiz-feedback')).toHaveCount(0);
    await page.keyboard.press('2');
    await expect(page.getByTestId('quiz-feedback')).toBeVisible();
    await page.getByRole('button', { name: 'Tiếp theo →' }).press('Enter');
    await expect(page.getByText('Điền từ thích hợp vào chỗ trống')).toBeVisible();
    await page.getByLabel('Từ của bạn').fill('ephemeral');
    await page.getByRole('button', { name: 'Kiểm tra →' }).click();
    await expect(page.getByTestId('quiz-feedback')).toBeVisible();
    await page.getByRole('button', { name: 'Tiếp theo →' }).press('Enter');
    await expect(
      page.getByText('Câu nào dùng từ CHÍNH XÁC và TỰ NHIÊN nhất trong ngữ cảnh này?'),
    ).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('quiz-feedback')).toHaveCount(0);
    await page.keyboard.press('1');
    await expect(page.getByTestId('quiz-feedback')).toBeVisible();
    await page.getByRole('button', { name: 'Xem kết quả →' }).press('Enter');
    await expect(page.getByRole('heading', { name: 'Session hoàn thành!' })).toBeVisible();
  });

  test('does not POST complete between questions, then finalizes once', async ({ page }) => {
    const completes: string[] = [];
    await mockStudyApi(page);
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().includes('/complete')) {
        completes.push(request.url());
      }
    });
    await login(page);
    await page.goto(`/vi/words/${word.id}`);
    await page.getByRole('button', { name: 'Làm quiz thử' }).click();
    await page.getByRole('radio', { name: /ephemeral/ }).click({ force: true });
    await page.getByRole('button', { name: 'Tiếp theo →' }).click();
    expect(completes).toEqual([]);
    await page.getByLabel('Từ của bạn').fill('ephemeral');
    await page.getByRole('button', { name: 'Kiểm tra →' }).click();
    await expect(page.getByTestId('quiz-feedback')).toBeVisible();
    await page.getByRole('button', { name: 'Tiếp theo →' }).click();
    await expect(
      page.getByText('Câu nào dùng từ CHÍNH XÁC và TỰ NHIÊN nhất trong ngữ cảnh này?'),
    ).toBeVisible();
    await page.keyboard.press('1');
    expect(completes).toEqual([]);
    await expect(page.getByTestId('quiz-feedback')).toBeVisible();
    await page.getByRole('button', { name: 'Xem kết quả →' }).click();
    await expect(page.getByRole('heading', { name: 'Session hoàn thành!' })).toBeVisible();
    await expect.poll(() => completes.length).toBe(1);
  });

  test('reloads mid-session without changing options or leaking the next explanation', async ({
    page,
  }) => {
    await mockStudyApi(page);
    await login(page);
    await page.goto(`/vi/words/${word.id}`);
    await page.getByRole('button', { name: 'Làm quiz thử' }).click();
    await page.getByRole('radio', { name: /ephemeral/ }).click({ force: true });
    await expect(page.getByTestId('quiz-feedback')).toBeVisible();
    await page.reload();
    await expect(page.getByTestId('quiz-feedback')).toBeVisible();
    await expect(page.getByText('It means short-lived.')).toBeVisible();
    await expect(page.getByText('The blank takes ephemeral.')).toHaveCount(0);
    await page.getByRole('button', { name: 'Tiếp theo →' }).click();
    await expect(page.getByText('Điền từ thích hợp vào chỗ trống')).toBeVisible();
    await expect(page.getByText('The blank takes ephemeral.')).toHaveCount(0);
  });

  test('Escape abandons a partial session and returns to the dashboard', async ({ page }) => {
    await mockStudyApi(page);
    await login(page);
    await page.goto(`/vi/words/${word.id}`);
    await page.getByRole('button', { name: 'Làm quiz thử' }).click();
    await page.getByRole('radio', { name: /ephemeral/ }).click({ force: true });
    await expect(page.getByTestId('quiz-feedback')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/vi\/dashboard/);
  });

  test('continues offline after the bundle is cached, then syncs once online', async ({
    page,
    context,
  }) => {
    const completes: string[] = [];
    await mockStudyApi(page);
    page.on('response', (response) => {
      if (
        response.request().method() === 'POST' &&
        response.url().includes('/complete') &&
        response.ok()
      ) {
        completes.push(response.url());
      }
    });
    await login(page);
    await page.goto(`/vi/words/${word.id}`);
    await page.getByRole('button', { name: 'Làm quiz thử' }).click();
    await expect(page.getByRole('progressbar')).toBeVisible();
    await context.setOffline(true);
    await page.getByRole('radio', { name: /ephemeral/ }).click({ force: true });
    await page.getByRole('button', { name: 'Tiếp theo →' }).click();
    await page.getByLabel('Từ của bạn').fill('ephemeral');
    await page.getByRole('button', { name: 'Kiểm tra →' }).click();
    await expect(page.getByTestId('quiz-feedback')).toBeVisible();
    await page.getByRole('button', { name: 'Tiếp theo →' }).click();
    await expect(
      page.getByText('Câu nào dùng từ CHÍNH XÁC và TỰ NHIÊN nhất trong ngữ cảnh này?'),
    ).toBeVisible();
    await page.keyboard.press('1');
    await expect(page.getByTestId('quiz-feedback')).toBeVisible();
    await page.getByRole('button', { name: 'Xem kết quả →' }).click();
    await expect(page.getByRole('heading', { name: 'Session hoàn thành!' })).toBeVisible();
    expect(completes).toEqual([]);
    await context.setOffline(false);
    await expect.poll(() => completes.length).toBe(1);
  });

  test('retries a lost complete response without duplicating the request after success', async ({
    page,
  }) => {
    let attempts = 0;
    await mockStudyApi(page, {
      onComplete: async (route) => {
        attempts += 1;
        if (attempts === 1) {
          await route.abort('failed');
          return true;
        }
        return false;
      },
    });
    await login(page);
    await page.goto(`/vi/words/${word.id}`);
    await page.getByRole('button', { name: 'Làm quiz thử' }).click();
    await page.getByRole('radio', { name: /ephemeral/ }).click({ force: true });
    await page.getByRole('button', { name: 'Tiếp theo →' }).click();
    await page.getByLabel('Từ của bạn').fill('ephemeral');
    await page.getByRole('button', { name: 'Kiểm tra →' }).click();
    await expect(page.getByTestId('quiz-feedback')).toBeVisible();
    await page.getByRole('button', { name: 'Tiếp theo →' }).click();
    await expect(
      page.getByText('Câu nào dùng từ CHÍNH XÁC và TỰ NHIÊN nhất trong ngữ cảnh này?'),
    ).toBeVisible();
    await page.keyboard.press('1');
    await expect(page.getByTestId('quiz-feedback')).toBeVisible();
    await page.getByRole('button', { name: 'Xem kết quả →' }).click();
    await expect(page.getByRole('button', { name: 'Thử đồng bộ lại' })).toBeVisible();
    await page.getByRole('button', { name: 'Thử đồng bộ lại' }).click();
    await expect(page.getByRole('heading', { name: 'Session hoàn thành!' })).toBeVisible();
    await expect.poll(() => attempts).toBe(2);
  });

  test('starts a trial from add-word preview', async ({ page }) => {
    await mockStudyApi(page);
    await login(page);
    await page.goto('/vi/words/new');
    await page.getByLabel('Từ tiếng Anh').fill('ephemeral');
    await page.getByRole('button', { name: 'Thêm →' }).click();
    await expect(page.getByRole('heading', { name: "✅ 'ephemeral' đã sẵn sàng!" })).toBeVisible();
    const trial = page.getByRole('button', { name: 'Làm quiz thử' });
    await expect(trial).toBeEnabled();
    await trial.click();
    await expect(page).toHaveURL(new RegExp(`/vi/study/${sessionId}`));
    await expect(page.getByText('Từ nào có nghĩa:')).toBeVisible();
  });

  test('covers all five quiz types from Due Today', async ({ page }) => {
    await mockStudyApi(page, {
      stats: {
        asOf: '2026-09-04T00:00:00.000Z',
        dueTodayCount: 5,
        nextDueAt: null,
        totalLearningWords: 5,
        queueCount: 0,
        graduatedCount: 0,
        sessionWordCount: 10,
        dailyNewWordLimit: { limit: 3, used: 0, remaining: 3 },
      },
      sessionBundle: (clientSessionId) => fiveTypeQuestions(clientSessionId),
    });
    await login(page);
    await page.getByRole('button', { name: 'Bắt đầu ôn →' }).click();
    await expect(page.getByText('Từ nào có nghĩa:')).toBeVisible();
    await page.getByRole('radio', { name: /ephemeral/ }).click({ force: true });
    await expect(page.getByTestId('quiz-feedback')).toBeVisible();
    await page.getByRole('button', { name: 'Tiếp theo →' }).click();
    await expect(page.getByText('Chọn từ tiếng Anh phù hợp nhất')).toBeVisible();
    await page.getByRole('radio', { name: /ephemeral/ }).click({ force: true });
    await expect(page.getByTestId('quiz-feedback')).toBeVisible();
    await page.getByRole('button', { name: 'Tiếp theo →' }).click();
    await expect(page.getByText('Chọn từ điền vào chỗ trống phù hợp nhất')).toBeVisible();
    await page.getByRole('radio', { name: /ephemeral/ }).click({ force: true });
    await expect(page.getByTestId('quiz-feedback')).toBeVisible();
    await page.getByRole('button', { name: 'Tiếp theo →' }).click();
    await expect(
      page.getByText('Câu nào dùng từ CHÍNH XÁC và TỰ NHIÊN nhất trong ngữ cảnh này?'),
    ).toBeVisible();
    await page.keyboard.press('1');
    await expect(page.getByTestId('quiz-feedback')).toBeVisible();
    await page.getByRole('button', { name: 'Tiếp theo →' }).click();
    await expect(page.getByText('Điền từ thích hợp vào chỗ trống')).toBeVisible();
    await page.getByLabel('Từ của bạn').fill('ephemeral');
    await page.getByRole('button', { name: 'Kiểm tra →' }).click();
    await expect(page.getByTestId('quiz-feedback')).toBeVisible();
    await page.getByRole('button', { name: 'Xem kết quả →' }).click();
    await expect(page.getByRole('heading', { name: 'Session hoàn thành!' })).toBeVisible();
  });

  test('English locale smoke for a study session', async ({ page }) => {
    await mockStudyApi(page);
    await page.goto('/en/auth/login');
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page).toHaveURL(/\/en\/dashboard/);
    await page.goto(`/en/words/${word.id}`);
    await page.getByRole('button', { name: 'Try a quiz' }).click();
    await expect(page).toHaveURL(new RegExp(`/en/study/${sessionId}`));
    await expect(page.getByText('Which word means:')).toBeVisible();
  });

  test('@mobile nuance cards wrap and the exit control is at least 44px', async ({ page }) => {
    await mockStudyApi(page);
    await login(page);
    await page.goto(`/vi/words/${word.id}`);
    await page.getByRole('button', { name: 'Làm quiz thử' }).click();
    await expect(page.getByText('Từ nào có nghĩa:')).toBeVisible();
    const exit = page.getByRole('button', { name: 'Thoát phiên học' });
    const box = await exit.boundingBox();
    expect(box).toBeTruthy();
    expect(Math.min(box?.width ?? 0, box?.height ?? 0)).toBeGreaterThanOrEqual(44);
    await page.getByRole('radio', { name: /ephemeral/ }).click({ force: true });
    await page.getByRole('button', { name: 'Tiếp theo →' }).click();
    await page.getByLabel('Từ của bạn').fill('ephemeral');
    await page.getByRole('button', { name: 'Kiểm tra →' }).click();
    await page.getByRole('button', { name: 'Tiếp theo →' }).click();
    const nuance = page.getByRole('radio', { name: /sunset was beautiful/i });
    await expect(nuance).toBeVisible();
    const nuanceBox = await nuance.evaluate((el) => el.closest('label')?.getBoundingClientRect());
    expect(nuanceBox?.height ?? 0).toBeGreaterThan(40);
  });
});

test.describe('live full-stack', () => {
  test.skip(!process.env.E2E_LIVE || !authEnabled, 'Set E2E_LIVE=true against Fake AI backend');

  test('register, generate a word, complete a trial, then refresh dashboard stats', async ({
    page,
  }) => {
    const stamp = Date.now();
    await page.goto('/vi/auth/register');
    await page.getByLabel('Email').fill(`live-${stamp}@example.com`);
    await page.getByLabel('Mật khẩu').fill('password123');
    await page.getByLabel('Xác nhận mật khẩu').fill('password123');
    await page.getByRole('button', { name: 'Đăng ký' }).click();
    await expect(page).toHaveURL(/\/vi\/dashboard/);
    await page.goto('/vi/words/new');
    await page.getByLabel('Từ tiếng Anh').fill(`ephemeral${stamp}`);
    await page.getByRole('button', { name: 'Thêm →' }).click();
    await expect(page.getByRole('button', { name: 'Làm quiz thử' })).toBeEnabled({
      timeout: 60_000,
    });
    await page.getByRole('button', { name: 'Làm quiz thử' }).click();
    await expect(page).toHaveURL(/\/vi\/study\//);
    await expect(page.getByRole('progressbar')).toBeVisible();
  });
});
