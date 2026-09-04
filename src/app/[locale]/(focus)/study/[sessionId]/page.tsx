import { isAuthEnabled } from '@/config/features.config';
import { AuthGuard } from '@/features/_optional/auth/auth-guard';
import { QuizSessionContent } from '@/features/learning/quiz-session-content';

export default async function StudySessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const content = <QuizSessionContent sessionId={sessionId} />;

  return isAuthEnabled() ? <AuthGuard>{content}</AuthGuard> : content;
}
