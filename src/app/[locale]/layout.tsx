import type { Metadata } from 'next';
import Script from 'next/script';
import { notFound } from 'next/navigation';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import { setRequestLocale } from 'next-intl/server';
import { getEnvConfig } from '@/config/env';
import { LocaleProviders } from '@/infrastructure/providers/locale-providers';
import { AuthHydrator } from '@/features/_optional/auth/auth-hydrator';
import { AppHeader } from '@/features/app/app-header';
import { routing } from '@/infrastructure/i18n/routing';
import { cn } from '@/lib/cn';
import { theme } from '@/lib/theme-classes';

const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='light')document.documentElement.classList.remove('dark');else document.documentElement.classList.add('dark');}catch(e){}})();`;

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const env = getEnvConfig();
  return {
    title: env.APP_NAME,
    description: `${env.APP_NAME} — Next.js frontend starter`,
  };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={cn('dark', GeistSans.variable, GeistMono.variable)}
      suppressHydrationWarning
    >
      <body className={cn('min-h-full font-sans antialiased', theme.body)}>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <LocaleProviders>
          <AuthHydrator>
            <div className="mx-auto min-h-screen max-w-3xl px-4 py-8">
              <AppHeader />
              {children}
            </div>
          </AuthHydrator>
        </LocaleProviders>
      </body>
    </html>
  );
}
