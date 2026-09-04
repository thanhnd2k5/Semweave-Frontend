'use client';

import { useEffect, useId, useRef } from 'react';
import { Radio, RadioGroup } from '@/components/ui/RadioGroup';
import { cn } from '@/lib/cn';
import { theme } from '@/lib/theme-classes';
import type { QuizType, SessionQuestionOption } from './types';

interface ChoiceQuestionProps {
  prompt: string;
  instruction: string;
  options: SessionQuestionOption[];
  value: string;
  onChange: (optionId: string) => void;
  quizType: QuizType;
  disabled?: boolean;
}

export function ChoiceQuestion({
  prompt,
  instruction,
  options,
  value,
  onChange,
  quizType,
  disabled,
}: ChoiceQuestionProps) {
  const instructionId = useId();
  const groupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const first = groupRef.current?.querySelector<HTMLInputElement>(
      'input[type="radio"]:not(:disabled)',
    );
    first?.focus();
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (disabled || event.altKey || event.ctrlKey || event.metaKey) return;
      const index = Number(event.key) - 1;
      if (index < 0 || index >= options.length) return;
      event.preventDefault();
      onChange(options[index].id);
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [disabled, onChange, options]);

  return (
    <section className="flex flex-col gap-5" aria-labelledby={instructionId}>
      <p id={instructionId} className={cn('m-0 text-sm', theme.muted)}>
        {instruction}
      </p>
      <p className="m-0 max-w-[65ch] text-base leading-relaxed">{prompt}</p>
      <div ref={groupRef}>
        <RadioGroup
          name="quiz-choice"
          value={value}
          onChange={onChange}
          labelledBy={instructionId}
        >
          {options.map((option, index) => (
            <Radio
              key={option.id}
              value={option.id}
              disabled={disabled}
              variant="card"
              className={quizType === 'NUANCE' ? theme.radioCardNuance : undefined}
            >
              <span className="sr-only">{index + 1}. </span>
              {option.text}
            </Radio>
          ))}
        </RadioGroup>
      </div>
    </section>
  );
}
