import { isAuthEnabled } from '@/config/features.config';
import { AuthGuard } from '@/features/_optional/auth/auth-guard';
import { WordDetailContent } from '@/features/words/word-detail-content';

export default async function WordDetailPage({
  params,
}: {
  params: Promise<{ wordId: string }>;
}) {
  const { wordId } = await params;
  const content = <WordDetailContent wordId={wordId} />;

  return isAuthEnabled() ? <AuthGuard>{content}</AuthGuard> : content;
}
