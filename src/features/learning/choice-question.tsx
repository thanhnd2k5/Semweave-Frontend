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
      if (
        event.key === 'ArrowDown' ||
        event.key === 'ArrowUp' ||
        event.key === 'ArrowLeft' ||
        event.key === 'ArrowRight'
      ) {
        const radios = [
          ...(groupRef.current?.querySelectorAll<HTMLInputElement>(
            'input[type="radio"]:not(:disabled)',
          ) ?? []),
        ];
        if (radios.length === 0) return;
        event.preventDefault();
        const currentIndex = radios.findIndex((radio) => radio === document.activeElement);
        const delta = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1;
        const nextIndex =
          currentIndex < 0 ? 0 : (currentIndex + delta + radios.length) % radios.length;
        radios[nextIndex]?.focus();
        return;
      }
      const index = Number(event.key) - 1;
      if (index < 0 || index >= options.length) return;
      event.preventDefault();
      onChange(options[index].id);
    }

    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
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
              className={quizType === 'NUANCE_COMPARISON' ? theme.radioCardNuance : undefined}
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
