'use client';

import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ROUTES } from '@/common/constants/routes';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useRouter } from '@/infrastructure/i18n/navigation';
import { cn } from '@/lib/cn';
import { theme } from '@/lib/theme-classes';
import { importWords } from './api';
import { parseBatchTerms } from './batch-parser';

export function BatchImport() {
  const t = useTranslations('words.batch');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const parsed = useMemo(() => parseBatchTerms(input), [input]);
  const lineCount = input ? input.split(/\r?\n/).length : 0;

  const importMutation = useMutation({
    mutationFn: ({ terms, tags }: { terms: string[]; tags: string[] }) =>
      importWords(terms, tags),
    onSuccess: (result) => {
      router.push(`${ROUTES.dashboard}?batch=${encodeURIComponent(result.batchId)}`);
    },
  });

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lineCount > 50) {
      setValidationError(t('tooMany'));
      return;
    }
    if (parsed.tooLongCount > 0) {
      setValidationError(t('tooLong', { count: parsed.tooLongCount }));
      return;
    }
    if (parsed.terms.length === 0) {
      setValidationError(t('empty'));
      return;
    }

    const tags = [...new Set(tagsInput.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
    if (tags.length > 10 || tags.some((tag) => tag.length > 30)) {
      setValidationError(t('requestError'));
      return;
    }
    setValidationError(null);
    importMutation.mutate({ terms: input.split(/\r?\n/), tags });
  }

  if (!open) {
    return (
      <Button type="button" variant="ghost" className="self-start px-0" onClick={() => setOpen(true)} aria-expanded="false">
        {t('open')}
      </Button>
    );
  }

  return (
    <section className={cn(theme.surface, 'flex flex-col gap-4 p-5')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-title">{t('title')}</h2>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)} aria-expanded="true">
          {t('collapse')}
        </Button>
      </div>
      <p className={cn('m-0', theme.muted)}>{t('instruction')}</p>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <Textarea
          label={t('label')}
          name="batch-terms"
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            setValidationError(null);
          }}
          placeholder={t('placeholder')}
          rows={6}
          disabled={importMutation.isPending}
          error={validationError ?? undefined}
        />
        <Input
          label={t('tagsLabel')}
          name="batch-tags"
          value={tagsInput}
          onChange={(event) => setTagsInput(event.target.value)}
          placeholder={t('tagsPlaceholder')}
          disabled={importMutation.isPending}
        />
        {input ? (
          <p className={cn('m-0 text-sm', theme.muted)}>
            {t('summary', {
              valid: parsed.terms.length,
              duplicate: parsed.duplicateCount,
              invalid: parsed.blankCount + parsed.tooLongCount,
            })}{' '}
            · {t('max')}
          </p>
        ) : null}
        {importMutation.isError ? <p className={theme.errorSurface} role="alert">{t('requestError')}</p> : null}
        <Button type="submit" size="lg" className="w-full sm:w-fit sm:self-end" isLoading={importMutation.isPending} disabled={parsed.terms.length === 0 || importMutation.isPending}>
          {importMutation.isPending ? t('submitting') : t('submit')}
        </Button>
      </form>
    </section>
  );
}
