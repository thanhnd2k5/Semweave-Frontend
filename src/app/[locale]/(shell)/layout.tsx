import { AppHeader } from '@/features/app/app-header';

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-8">
      <AppHeader />
      {children}
    </div>
  );
}
