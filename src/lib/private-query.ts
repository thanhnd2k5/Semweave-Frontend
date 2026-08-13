import type { QueryClient, QueryKey } from '@tanstack/react-query';

export const ANONYMOUS_QUERY_IDENTITY = 'anonymous';

export function getQueryIdentity(userId: string | null | undefined): string {
  return userId ?? ANONYMOUS_QUERY_IDENTITY;
}

export const privateQueryKeys = {
  root: (identity: string) => ['private', identity] as const,
  words: (identity: string) => [...privateQueryKeys.root(identity), 'words'] as const,
  wordList: (identity: string, filters: QueryKey = []) =>
    [...privateQueryKeys.words(identity), 'list', ...filters] as const,
  wordDetail: (identity: string, wordId: string | null) =>
    [...privateQueryKeys.words(identity), 'detail', wordId] as const,
  wordImport: (identity: string, batchId: string) =>
    [...privateQueryKeys.words(identity), 'import', batchId] as const,
  queue: (identity: string) => [...privateQueryKeys.root(identity), 'queue'] as const,
  queuePage: (identity: string, page: number) =>
    [...privateQueryKeys.queue(identity), page] as const,
};

/** Removes data and mutations that belonged to the previous signed-in identity. */
export async function clearPrivateQueryCache(
  queryClient: QueryClient,
  identity: string,
): Promise<void> {
  const queryKey = privateQueryKeys.root(identity);
  await queryClient.cancelQueries({ queryKey });
  queryClient.removeQueries({ queryKey });
  queryClient.getMutationCache().clear();
}
