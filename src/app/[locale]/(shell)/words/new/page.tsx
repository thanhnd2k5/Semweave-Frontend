import { isAuthEnabled } from '@/config/features.config';
import { AuthGuard } from '@/features/_optional/auth/auth-guard';
import { AddWordContent } from '@/features/words/add-word-content';

export default function NewWordPage() {
  const content = <AddWordContent />;

  if (isAuthEnabled()) {
    return <AuthGuard>{content}</AuthGuard>;
  }

  return content;
}
