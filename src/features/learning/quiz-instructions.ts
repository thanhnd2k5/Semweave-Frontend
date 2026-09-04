import type { QuizType } from './types';

export const QUIZ_INSTRUCTION_KEYS: Record<QuizType, string> = {
  FILL_IN_BLANK: 'instructionFillIn',
  DEFINITION_MATCH: 'instructionDefinition',
  REVERSE_RECALL: 'instructionReverse',
  CONTEXT_SELECTION: 'instructionContext',
  NUANCE: 'instructionNuance',
};

export const MIN_TRIAL_QUIZ_COUNT = 3;

export function canStartWordTrial(quizCount: number | undefined): boolean {
  return (quizCount ?? 0) >= MIN_TRIAL_QUIZ_COUNT;
}
