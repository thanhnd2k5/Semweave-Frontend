import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import { ChoiceQuestion } from '@/features/learning/choice-question';
import { FillInBlankQuestion } from '@/features/learning/fill-in-blank-question';
import { SessionSummaryView } from '@/features/learning/session-summary';
import { canStartWordTrial } from '@/features/learning/quiz-instructions';
import { QuizFeedback } from '@/components/ui/QuizFeedback';
import messages from '@/messages/vi.json';
import type { QuizType, SessionQuestionOption, SessionSummary } from '@/features/learning/types';

function wrap(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="vi" messages={messages} timeZone="UTC">
      {ui}
    </NextIntlClientProvider>,
  );
}

const options: SessionQuestionOption[] = [
  { id: 'a', text: 'lasting' },
  { id: 'b', text: 'ephemeral' },
  { id: 'c', text: 'heavy' },
  { id: 'd', text: 'ancient' },
];

const instructions: Record<QuizType, string> = {
  FILL_IN_BLANK: 'Điền từ thích hợp vào chỗ trống',
  REVERSE_RECALL: 'Chọn từ tiếng Anh phù hợp nhất',
  CONTEXT_SELECTION: 'Chọn từ điền vào chỗ trống phù hợp nhất',
  DEFINITION_MATCH: 'Từ nào có nghĩa:',
  NUANCE: 'Câu nào dùng từ CHÍNH XÁC và TỰ NHIÊN nhất trong ngữ cảnh này?',
};

describe('quiz UI primitives', () => {
  it('starts a trial only when the pool has at least three quizzes', () => {
    expect(canStartWordTrial(2)).toBe(false);
    expect(canStartWordTrial(3)).toBe(true);
  });

  it.each(Object.entries(instructions) as Array<[QuizType, string]>)(
    'renders %s with the contract instruction and without the explanation',
    (type, instruction) => {
      if (type === 'FILL_IN_BLANK') {
        wrap(
          <FillInBlankQuestion
            prompt="The joy was ______."
            instruction={instruction}
            value=""
            onChange={() => undefined}
            onSubmit={() => undefined}
            submitLabel="Kiểm tra →"
            placeholder="Nhập từ..."
            inputLabel="Từ của bạn"
          />,
        );
      } else {
        wrap(
          <ChoiceQuestion
            prompt="Choose carefully"
            instruction={instruction}
            options={
              type === 'NUANCE'
                ? [
                    {
                      id: 'n1',
                      text: 'The sunset was beautiful, but the feeling was gone by morning and nobody remembered it.',
                    },
                    {
                      id: 'n2',
                      text: 'The sunset lasted for many years in the same exact place.',
                    },
                  ]
                : options
            }
            value=""
            onChange={() => undefined}
            quizType={type}
          />,
        );
      }

      expect(screen.getByText(instruction)).toBeInTheDocument();
      expect(screen.queryByText('short-lived')).not.toBeInTheDocument();
      expect(screen.queryByTestId('quiz-feedback')).not.toBeInTheDocument();
      if (type === 'NUANCE') {
        const radio = screen.getByRole('radio', { name: /sunset was beautiful/i });
        expect(radio.closest('label')?.className).toMatch(/min-h-\[4\.5rem\]/);
        expect(radio.closest('label')?.className).toMatch(/whitespace-normal/);
      }
    },
  );

  it('shows explanation only inside QuizFeedback after an answer', () => {
    wrap(
      <QuizFeedback
        isCorrect={false}
        title="Chưa đúng. Đáp án đúng là"
        correctAnswer="ephemeral"
        explanation="short-lived"
      />,
    );
    expect(screen.getByTestId('quiz-feedback')).toHaveTextContent('short-lived');
    expect(screen.getByTestId('quiz-feedback')).toHaveTextContent('ephemeral');
  });

  it('does not invent health or next due on a pending summary', () => {
    wrap(
      <SessionSummaryView
        canonical={null}
        sessionType="WORD_TRIAL"
        syncPending
        syncFailed={false}
        title="Session hoàn thành!"
        statsLine="1 từ · 100% đúng · 0 phút 3 giây"
        pendingHint="Đang chờ đồng bộ"
        failedHint="Không đồng bộ được kết quả."
        improvedLabel="Cải thiện:"
        reviewLabel="Cần ôn thêm:"
        nextDueLabel="Từ tiếp theo đến hạn: 3 giờ nữa"
        homeLabel="Home"
        addWordLabel="Thêm từ mới"
        viewWordLabel="Xem chi tiết từ"
        retryLabel="Thử đồng bộ lại"
        onHome={() => undefined}
        onAddWord={() => undefined}
      />,
    );

    expect(screen.getByText('Đang chờ đồng bộ')).toBeInTheDocument();
    expect(screen.queryByText(/Từ tiếp theo đến hạn/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Word health level/)).not.toBeInTheDocument();
  });

  it('shows canonical health after sync', () => {
    const canonical: SessionSummary = {
      sessionId: 'session-1',
      type: 'WORD_TRIAL',
      status: 'COMPLETED',
      totalWords: 1,
      totalQuestions: 3,
      answeredCount: 3,
      correctCount: 3,
      accuracy: 1,
      avgResponseTimeMs: 900,
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

    wrap(
      <SessionSummaryView
        canonical={canonical}
        sessionType="WORD_TRIAL"
        syncPending={false}
        syncFailed={false}
        title="Session hoàn thành!"
        statsLine="1 từ · 100% đúng · 0 phút 4 giây"
        pendingHint="Đang chờ đồng bộ"
        failedHint="Không đồng bộ được kết quả."
        improvedLabel="Cải thiện:"
        reviewLabel="Cần ôn thêm:"
        nextDueLabel="Từ tiếp theo đến hạn: 3 giờ nữa"
        homeLabel="Home"
        addWordLabel="Thêm từ mới"
        viewWordLabel="Xem chi tiết từ"
        retryLabel="Thử đồng bộ lại"
        onHome={() => undefined}
        onAddWord={() => undefined}
        onViewWord={() => undefined}
      />,
    );

    expect(screen.getByText('Cải thiện:')).toBeInTheDocument();
    expect(screen.getByLabelText('Word health level 2 of 4')).toBeInTheDocument();
    expect(screen.getByText('Từ tiếp theo đến hạn: 3 giờ nữa')).toBeInTheDocument();
    expect(screen.queryByText('Đang chờ đồng bộ')).not.toBeInTheDocument();
  });
});
