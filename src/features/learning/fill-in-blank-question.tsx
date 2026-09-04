'use client';

import { useId } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { theme } from '@/lib/theme-classes';

interface FillInBlankQuestionProps {
  prompt: string;
  instruction: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  submitLabel: string;
  placeholder: string;
  inputLabel: string;
  disabled?: boolean;
}

export function FillInBlankQuestion({
  prompt,
  instruction,
  value,
  onChange,
  onSubmit,
  submitLabel,
  placeholder,
  inputLabel,
  disabled,
}: FillInBlankQuestionProps) {
  const instructionId = useId();

  return (
    <section className="flex flex-col gap-5" aria-labelledby={instructionId}>
      <p id={instructionId} className={cn('m-0 text-sm', theme.muted)}>
        {instruction}
      </p>
      <p className="m-0 max-w-[65ch] text-base leading-relaxed">{prompt}</p>
      <div className="mx-auto w-full max-w-sm">
        <Input
          label={inputLabel}
          name="fill-in-answer"
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="text-center text-word"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onSubmit();
            }
          }}
        />
      </div>
      <div className="flex justify-end">
        <Button type="button" onClick={onSubmit} disabled={disabled || value.trim().length === 0}>
          {submitLabel}
        </Button>
      </div>
    </section>
  );
}
