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
    { id: 'quiz-3', type: 'NUANCE', difficulty: 2 },
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
        type: 'NUANCE',
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

function summary() {
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
  };
}

async function respond(route: Route, data: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({ success: status < 400, ...(status < 400 ? { data } : { error: data }) }),
  });
}

async function mockStudyApi(page: Page) {
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
      await respond(route, {
        asOf: '2026-09-04T00:00:00.000Z',
        dueTodayCount: 0,
        nextDueAt: null,
        totalLearningWords: 1,
        queueCount: 0,
        graduatedCount: 0,
        sessionWordCount: 10,
        dailyNewWordLimit: { limit: 3, used: 0, remaining: 3 },
      });
      return;
    }
    if (url.includes(`/words/${word.id}`) && method === 'GET') {
      await respond(route, word);
      return;
    }
    if (url.endsWith('/sessions') && method === 'POST') {
      const body = route.request().postDataJSON() as { clientSessionId: string };
      await respond(route, questions(body.clientSessionId));
      return;
    }
    if (url.includes(`/sessions/${sessionId}/complete`) && method === 'POST') {
      await respond(route, summary());
      return;
    }
    if (url.includes(`/sessions/${sessionId}`) && method === 'GET') {
      await respond(route, questions('11111111-1111-4111-8111-111111111111'));
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
    await expect(page.getByRole('button', { name: 'Home' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Xem chi tiết từ' })).toBeVisible();
  });
});
