import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import {
  clearPrivateQueryCache,
  getQueryIdentity,
  privateQueryKeys,
} from '@/lib/private-query';

describe('private query cache', () => {
  it('scopes private keys by authenticated identity', () => {
    expect(privateQueryKeys.wordDetail('user-a', 'word-1')).not.toEqual(
      privateQueryKeys.wordDetail('user-b', 'word-1'),
    );
    expect(getQueryIdentity(null)).toBe('anonymous');
  });

  it('removes only the previous identity data', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(privateQueryKeys.wordList('user-a'), ['private-a']);
    queryClient.setQueryData(privateQueryKeys.wordList('user-b'), ['private-b']);
    queryClient.setQueryData(['api', 'health'], 'healthy');

    await clearPrivateQueryCache(queryClient, 'user-a');

    expect(queryClient.getQueryData(privateQueryKeys.wordList('user-a'))).toBeUndefined();
    expect(queryClient.getQueryData(privateQueryKeys.wordList('user-b'))).toEqual(['private-b']);
    expect(queryClient.getQueryData(['api', 'health'])).toBe('healthy');
  });
});
