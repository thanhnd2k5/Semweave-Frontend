import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function LoadingPage() {
  return (
    <div className="flex justify-center py-8">
      <LoadingSpinner size="lg" />
    </div>
  );
}
