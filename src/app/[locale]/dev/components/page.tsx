import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LinearProgress } from '@/components/ui/LinearProgress';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Skeleton } from '@/components/ui/Skeleton';
import { WordHealthBadge } from '@/components/ui/WordHealthBadge';
import { theme } from '@/lib/theme-classes';
import { DevComponentsInteractive } from './dev-components-interactive';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={`flex flex-col gap-4 ${theme.surface} p-6`}>
      <h2 className="text-title">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className={`text-xs uppercase tracking-wide ${theme.muted}`}>{label}</span>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

/**
 * Internal design QA page — not linked in nav. Not localized on purpose:
 * this is a component/token inspector, not a product screen.
 * Toggle dark/light via header switch to check both palettes at once.
 */
export default function ComponentsShowcasePage() {
  return (
    <main className="flex flex-col gap-8 pb-16">
      <div>
        <h1 className="text-display">Component showcase</h1>
        <p className={theme.muted}>
          docs/design.md §8 — mỗi primitive, mọi variant/state, cả 2 theme. Dùng để review trực
          quan trước khi ghép vào screen thật.
        </p>
      </div>

      <Section title="Button — §8.1">
        <Row label="Variant (size md)">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
        </Row>
        <Row label="Size — sm=36px, md=44px, lg=48px">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </Row>
        <Row label="State">
          <Button>Default</Button>
          <Button disabled>Disabled</Button>
          <Button isLoading>Loading</Button>
        </Row>
      </Section>

      <Section title="Input — §8.2">
        <Row label="State">
          <Input label="Từ vựng" placeholder="Nhập từ..." className="max-w-64" />
          <Input label="Có lỗi" defaultValue="epheme" error="Không tìm thấy nghĩa phù hợp" className="max-w-64" />
          <Input label="Disabled" placeholder="—" disabled className="max-w-64" />
        </Row>
      </Section>

      <Section title="Textarea · Radio · Modal — §8.2b, §8.11, §8.10">
        <DevComponentsInteractive />
      </Section>

      <Section title="Badge — §8.3">
        <Row label="Variant">
          <Badge variant="neutral">Neutral</Badge>
          <Badge variant="accent">Đang chọn</Badge>
          <Badge variant="success">Đã học</Badge>
          <Badge variant="error">Sai nhiều</Badge>
          <Badge variant="warm">Đến hạn</Badge>
        </Row>
      </Section>

      <Section title="WordHealthBadge — §8.4 (contrast-safe cả 2 theme)">
        <Row label="Level 1 → 4">
          <WordHealthBadge level={1} />
          <WordHealthBadge level={2} />
          <WordHealthBadge level={3} />
          <WordHealthBadge level={4} />
        </Row>
        <Row label="Trong ngữ cảnh — word card">
          <div className={`flex items-center gap-2 rounded-md border border-border px-3 py-2`}>
            <span className="text-word">ephemeral</span>
            <WordHealthBadge level={2} />
          </div>
        </Row>
      </Section>

      <Section title="LoadingSpinner — §8.5">
        <Row label="Size">
          <LoadingSpinner size="sm" />
          <LoadingSpinner size="md" />
          <LoadingSpinner size="lg" />
        </Row>
        <Row label="Với label">
          <LoadingSpinner size="md" label="Đang tải..." />
        </Row>
      </Section>

      <Section title="ProgressRing — §8.6">
        <Row label="Value + center label">
          <ProgressRing value={20} size="sm" />
          <ProgressRing value={70} size="md">
            7/10
          </ProgressRing>
          <ProgressRing value={100} size="lg">
            10/10
          </ProgressRing>
        </Row>
      </Section>

      <Section title="LinearProgress — §8.6b">
        <Row label="Size sm — top bar Quiz session">
          <LinearProgress value={40} size="sm" label="Tiến độ câu hỏi 4/10" className="max-w-64" />
        </Row>
        <Row label="Size md — batch progress (add-word / dashboard)">
          <LinearProgress value={66} size="md" label="Đang thêm 2/3 từ" className="max-w-64" />
        </Row>
      </Section>

      <Section title="Skeleton — §8.7 (phải khớp kích thước nội dung thật)">
        <Row label="Word card loading state (ví dụ)">
          <div className="flex w-64 flex-col gap-2 rounded-md border border-border p-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-20" />
          </div>
        </Row>
      </Section>

      <Section title="Functional colors trên nền thật — §2.5">
        <Row label="Quiz feedback (màu + text, không chỉ màu — §14.5)">
          <div className={`rounded-md border-l-4 ${theme.errorBorder} bg-error/10 px-4 py-2 text-sm ${theme.errorText}`}>
            ✕ Sai rồi — đáp án đúng là <strong>ephemeral</strong>
          </div>
          <div className={`rounded-md border-l-4 border-success bg-success/10 px-4 py-2 text-sm ${theme.successText}`}>
            ✓ Chính xác!
          </div>
        </Row>
      </Section>
    </main>
  );
}
