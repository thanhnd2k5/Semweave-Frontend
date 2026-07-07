import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { AppProviders } from './app-providers';

interface LocaleProvidersProps {
  children: React.ReactNode;
}

export async function LocaleProviders({ children }: LocaleProvidersProps) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <AppProviders>{children}</AppProviders>
    </NextIntlClientProvider>
  );
}
