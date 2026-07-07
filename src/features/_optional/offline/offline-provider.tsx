'use client';

import { useEffect, type ReactNode } from 'react';
import { getLocalDb } from './local-db';

interface OfflineProviderProps {
  children: ReactNode;
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  useEffect(() => {
    void getLocalDb().open();
  }, []);

  return <>{children}</>;
}
