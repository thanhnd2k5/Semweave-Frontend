import { cn } from '@/lib/cn';
import { theme } from '@/lib/theme-classes';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

/** Multiline input — docs/design.md §8.2b. Visual sibling of `Input`. */
export function Textarea({ label, error, id, className, rows = 6, ...props }: TextareaProps) {
  const textareaId = id ?? props.name;

  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <label className={cn('text-sm font-medium', theme.muted)} htmlFor={textareaId}>
          {label}
        </label>
      ) : null}
      <textarea
        id={textareaId}
        rows={rows}
        className={cn(theme.textarea, error && theme.errorBorder, className)}
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
