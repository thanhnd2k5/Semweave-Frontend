import { cn } from '@/lib/cn';
import { theme } from '@/lib/theme-classes';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, id, className, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <label className={cn('text-sm font-medium', theme.muted)} htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={cn(theme.input, error && theme.errorBorder, className)}
        aria-invalid={!!error}
        {...props}
      />
      {error ? (
        <span className={cn('text-[0.8125rem]', theme.errorText)} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
