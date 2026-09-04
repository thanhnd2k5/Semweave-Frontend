import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import { DashboardLearningPanel } from '@/features/dashboard/dashboard-learning-panel';
import messages from '@/messages/vi.json';
import type { SessionStats } from '@/features/learning/types';

function wrap(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="vi" messages={messages} timeZone="UTC">
      {ui}
    </NextIntlClientProvider>,
  );
}

function stats(overrides: Partial<SessionStats> = {}): SessionStats {
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

describe('DashboardLearningPanel', () => {
  it('does not render a dead review CTA for a new user', () => {
    wrap(
      <DashboardLearningPanel
        stats={stats()}
        isPending={false}
        isError={false}
        startPending={false}
        startError={null}
        onStartReview={() => undefined}
        onRetry={() => undefined}
        onAddWord={() => undefined}
      />,
    );
    expect(screen.getByText('Thêm từ đầu tiên để bắt đầu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thêm từ →' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Bắt đầu ôn →' })).not.toBeInTheDocument();
  });

  it('hides the review button when nothing is due', () => {
    wrap(
      <DashboardLearningPanel
        stats={stats({
          totalLearningWords: 6,
          nextDueAt: '2026-09-05T15:00:00.000Z',
        })}
        isPending={false}
        isError={false}
        startPending={false}
        startError={null}
        onStartReview={() => undefined}
        onRetry={() => undefined}
        onAddWord={() => undefined}
      />,
    );
    expect(screen.getByText('Bạn đã ôn hết hôm nay!')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bắt đầu ôn →' })).not.toBeInTheDocument();
    expect(screen.queryByText('Word Map')).not.toBeInTheDocument();
  });

  it('starts a due-today session from the primary CTA', async () => {
    const user = userEvent.setup();
    const onStartReview = vi.fn();
    wrap(
      <DashboardLearningPanel
        stats={stats({ dueTodayCount: 12, totalLearningWords: 20, queueCount: 8, graduatedCount: 3 })}
        isPending={false}
        isError={false}
        startPending={false}
        startError={null}
        onStartReview={onStartReview}
        onRetry={() => undefined}
        onAddWord={() => undefined}
      />,
    );
    expect(screen.getByText('12 từ cần ôn hôm nay')).toBeInTheDocument();
    expect(screen.getByText('Queue chờ học')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Bắt đầu ôn →' }));
    expect(onStartReview).toHaveBeenCalledTimes(1);
  });

  it('keeps navigation available when stats fail', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    wrap(
      <DashboardLearningPanel
        stats={undefined}
        isPending={false}
        isError={true}
        startPending={false}
        startError={null}
        onStartReview={() => undefined}
        onRetry={onRetry}
        onAddWord={() => undefined}
      />,
    );
    expect(screen.getByText('Không tải được dữ liệu')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bắt đầu ôn →' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
