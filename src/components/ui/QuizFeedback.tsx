import { cn } from '@/lib/cn';
import { theme } from '@/lib/theme-classes';

interface QuizFeedbackProps {
  isCorrect: boolean;
  title: string;
  explanation: string;
  correctAnswer?: string;
  className?: string;
}

export function QuizFeedback({
  isCorrect,
  title,
  explanation,
  correctAnswer,
  className,
}: QuizFeedbackProps) {
  return (
    <div
      className={cn(
        isCorrect ? theme.quizFeedbackSuccess : theme.quizFeedbackError,
        className,
      )}
      role="status"
      aria-live="polite"
      data-testid="quiz-feedback"
      data-correct={isCorrect ? 'true' : 'false'}
    >
      <p className="m-0 font-medium">
        {isCorrect ? (
          <>
            <span aria-hidden>✓</span> {title}
          </>
        ) : (
          <>
            <span aria-hidden>✕</span> {title}
            {correctAnswer ? (
              <>
                {' '}
                <strong>{correctAnswer}</strong>
              </>
            ) : null}
          </>
        )}
      </p>
      {explanation ? <p className="mt-2 mb-0 text-sm text-text-primary">{explanation}</p> : null}
    </div>
  );
}
