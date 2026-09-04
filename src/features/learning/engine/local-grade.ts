import type { LocalGrade, SessionAttemptAnswer, SessionQuestion } from '../types';
import { gradeFillInBlank } from './fill-in-blank-grader';

export function gradeLocalAnswer(
  question: SessionQuestion,
  answer: SessionAttemptAnswer,
): LocalGrade {
  if (question.type === 'FILL_IN_BLANK') {
    if (answer.kind !== 'TEXT') {
      return { isCorrect: false, matchedVariant: null };
    }
    const graded = gradeFillInBlank({
      userAnswer: answer.text,
      correctAnswer: question.correctAnswer,
      acceptedVariants: question.acceptedVariants,
    });
    return { isCorrect: graded.isCorrect, matchedVariant: graded.matchedVariant };
  }

  if (answer.kind !== 'OPTION') {
    return { isCorrect: false, matchedVariant: null };
  }

  const option = question.options.find((item) => item.id === answer.optionId);
  return {
    isCorrect: Boolean(option && option.text === question.correctAnswer),
    matchedVariant: null,
  };
}
