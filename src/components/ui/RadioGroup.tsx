'use client';

import { createContext, useContext, useId } from 'react';
import { cn } from '@/lib/cn';
import { theme } from '@/lib/theme-classes';

interface RadioGroupContextValue {
  name: string;
  value: string;
  onChange: (value: string) => void;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

interface RadioGroupProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  /** ID of the element that labels this group (e.g. modal title). */
  labelledBy?: string;
  children: React.ReactNode;
  className?: string;
}

/** Radio group — docs/design.md §8.11. Native radios handle arrow-key navigation. */
export function RadioGroup({
  name,
  value,
  onChange,
  labelledBy,
  children,
  className,
}: RadioGroupProps) {
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className={cn('flex flex-col gap-2', className)}
    >
      <RadioGroupContext.Provider value={{ name, value, onChange }}>
        {children}
      </RadioGroupContext.Provider>
    </div>
  );
}

interface RadioProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export function Radio({ value, children, disabled }: RadioProps) {
  const ctx = useContext(RadioGroupContext);
  if (!ctx) {
    throw new Error('Radio must be used within RadioGroup');
  }

  const { name, value: selected, onChange } = ctx;
  const checked = selected === value;
  const id = useId();

  return (
    <label
      htmlFor={id}
      className={cn(theme.radioRow, disabled && 'cursor-not-allowed opacity-55')}
    >
      <span
        className={cn(theme.radioIndicator, checked && theme.radioIndicatorSelected)}
        aria-hidden
      >
        {checked ? <span className={theme.radioIndicatorDot} /> : null}
      </span>
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        disabled={disabled}
        className="sr-only"
      />
      <span className="text-sm text-text-primary">{children}</span>
    </label>
  );
}
