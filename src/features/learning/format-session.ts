export function formatDuration(ms: number, locale: string): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  if (locale.startsWith('vi')) {
    return `${minutes} phút ${seconds} giây`;
  }
  return `${minutes} min ${seconds} sec`;
}

export function formatRelativeDue(iso: string, locale: string, now = Date.now()): string {
  const target = Date.parse(iso);
  if (Number.isNaN(target)) return iso;
  const diff = target - now;
  const abs = Math.abs(diff);
  const hours = Math.round(abs / 3_600_000);
  const minutes = Math.max(1, Math.round(abs / 60_000));
  const vi = locale.startsWith('vi');
  if (diff <= 0) return vi ? 'ngay bây giờ' : 'now';
  if (hours >= 1) return vi ? `${hours} giờ nữa` : `in ${hours} hours`;
  return vi ? `${minutes} phút nữa` : `in ${minutes} minutes`;
}

export function accuracyPercent(correct: number, total: number, canonical?: number | null): number {
  if (canonical != null) return Math.round(canonical * 100);
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}
