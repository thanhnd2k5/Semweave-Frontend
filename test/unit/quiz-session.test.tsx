import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuizSessionContent } from '@/features/learning/quiz-session-content';
import { createLearningDb, deleteLearningDb } from '@/features/learning/offline/local-db';
import {
  createSessionRepository,
  setSessionRepositoryForTests,
} from '@/features/learning/offline/session-repository';
import { cacheCreatedSession } from '@/features/learning/session-runtime';
import { resetSyncInflightForTests } from '@/features/learning/offline/sync-worker';
import * as sessionApi from '@/features/learning/api';
import messages from '@/messages/vi.json';
import type { SessionBundle, SessionSummary } from '@/features/learning/types';

const replace = vi.fn();

vi.mock('@/infrastructure/i18n/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));

vi.mock('@/hooks/use-query-identity', () => ({
  useQueryIdentity: () => 'user-test',
}));

function bundle(): SessionBundle {
  return {
    id: 'session-ui',
    clientSessionId: '11111111-1111-4111-8111-111111111111',
    type: 'WORD_TRIAL',
    status: 'IN_PROGRESS',
    startedAt: '2026-08-13T03:00:00.000Z',
    totalWords: 1,
    totalQuestions: 2,
    questions: [
      {
        id: 'q1',
        position: 0,
        word: { id: 'w1', term: 'ephemeral', depthLevel: 1 },
        type: 'DEFINITION_MATCH',
        question: 'Choose the matching word',
        contextLabel: null,
        options: [
          { id: 'option_a', text: 'lasting' },
          { id: 'option_b', text: 'ephemeral' },
          { id: 'option_c', text: 'heavy' },
          { id: 'option_d', text: 'ancient' },
        ],
        correctAnswer: 'ephemeral',
        acceptedVariants: [],
        explanation: 'short-lived',
        difficulty: 1,
        gradingVersion: 1,
      },
      {
        id: 'q2',
        position: 1,
        word: { id: 'w1', term: 'ephemeral', depthLevel: 1 },
        type: 'FILL_IN_BLANK',
        question: 'The joy was ______.',
        contextLabel: null,
        options: [],
        correctAnswer: 'ephemeral',
        acceptedVariants: ['fleeting'],
        explanation: 'blank-reason',
        difficulty: 1,
        gradingVersion: 1,
      },
    ],
  };
}

function summary(): SessionSummary {
  return {
    sessionId: 'session-ui',
    type: 'WORD_TRIAL',
    status: 'COMPLETED',
    totalWords: 1,
    totalQuestions: 2,
    answeredCount: 2,
    correctCount: 2,
    accuracy: 1,
    avgResponseTimeMs: 800,
    durationMs: 4000,
    improvedWords: [
      {
        wordId: 'w1',
        term: 'ephemeral',
        levelBefore: 1,
        levelAfter: 2,
        nextReviewAt: '2026-09-05T00:00:00.000Z',
      },
    ],
    reviewWords: [],
    leveledUpWords: [],
    skippedAttempts: [],
    nextDueAt: '2026-09-05T00:00:00.000Z',
    syncedAt: '2026-09-04T12:00:00.000Z',
  };
}

describe('quiz session flow', () => {
  const names: string[] = [];

  beforeEach(() => {
    replace.mockReset();
    resetSyncInflightForTests();
  });

  afterEach(async () => {
    cleanup();
    await new Promise((resolve) => setTimeout(resolve, 0));
    setSessionRepositoryForTests(null);
    await Promise.all(names.splice(0).map((name) => deleteLearningDb(name)));
    vi.restoreAllMocks();
  });

  async function seed() {
    const name = `semweave-quiz-ui-${crypto.randomUUID()}`;
    names.push(name);
    const db = createLearningDb(name);
    await db.open();
    const repo = createSessionRepository(db);
    setSessionRepositoryForTests(repo);
    await cacheCreatedSession(repo, 'user-test', bundle(), { now: () => 1_000 });
    return repo;
  }

  function renderSession() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <NextIntlClientProvider locale="vi" messages={messages} timeZone="UTC">
          <QuizSessionContent sessionId="session-ui" />
        </NextIntlClientProvider>
      </QueryClientProvider>,
    );
  }

  it('answers, shows feedback without auto-advance, then reaches a synced summary', async () => {
    const user = userEvent.setup();
    vi.spyOn(sessionApi, 'completeSession').mockResolvedValue(summary());
    await seed();
    renderSession();

    expect(await screen.findByText('Từ nào có nghĩa:')).toBeInTheDocument();
    expect(screen.queryByText('short-lived')).not.toBeInTheDocument();
    expect(screen.queryByTestId('quiz-feedback')).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /ephemeral/ }));
    expect(await screen.findByTestId('quiz-feedback')).toHaveAttribute('data-correct', 'true');
    expect(screen.getByText('short-lived')).toBeInTheDocument();
    expect(screen.getByText('Choose the matching word')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tiếp theo →' })).toBeInTheDocument();
    expect(screen.queryByText('The joy was ______.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tiếp theo →' }));
    expect(await screen.findByText('Điền từ thích hợp vào chỗ trống')).toBeInTheDocument();
    expect(screen.queryByText('blank-reason')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Từ của bạn'), 'ephemeral');
    await user.click(screen.getByRole('button', { name: 'Kiểm tra →' }));
    expect(await screen.findByTestId('quiz-feedback')).toBeInTheDocument();
    expect(screen.getByText('blank-reason')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Xem kết quả →' }));
    expect(await screen.findByText('Session hoàn thành!')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByLabelText('Word health level 2 of 4')).toBeInTheDocument();
    });
    expect(screen.queryByText('Đang chờ đồng bộ')).not.toBeInTheDocument();
  });

  it('selects a choice with key 1 and keeps the exit control labeled', async () => {
    const user = userEvent.setup();
    vi.spyOn(sessionApi, 'completeSession').mockResolvedValue(summary());
    await seed();
    renderSession();

    expect(await screen.findByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thoát phiên học' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAccessibleName(/Câu/);

    await user.keyboard('1');
    expect(await screen.findByTestId('quiz-feedback')).toHaveAttribute('data-correct', 'false');
  });

  it('shows a pending summary without health when sync fails', async () => {
    const user = userEvent.setup();
    vi.spyOn(sessionApi, 'completeSession').mockRejectedValue(new Error('offline'));
    await seed();
    renderSession();

    await user.click(await screen.findByRole('radio', { name: /ephemeral/ }));
    await user.click(await screen.findByRole('button', { name: 'Tiếp theo →' }));
    await user.type(await screen.findByLabelText('Từ của bạn'), 'ephemeral');
    await user.click(screen.getByRole('button', { name: 'Kiểm tra →' }));
    await user.click(await screen.findByRole('button', { name: 'Xem kết quả →' }));

    expect(await screen.findByText('Session hoàn thành!')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Không đồng bộ được kết quả');
    });
    expect(screen.queryByText('Đang chờ đồng bộ')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Word health level/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Từ tiếp theo đến hạn/)).not.toBeInTheDocument();
  });
});
