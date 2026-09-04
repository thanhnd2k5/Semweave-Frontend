import type { SessionQuestion } from '../types';

export type SessionPhase = 'question' | 'feedback' | 'summary';

export type SessionMachineState = {
  phase: SessionPhase;
  cursor: number;
  answeredQuestionIds: string[];
  currentFeedback: { questionId: string; isCorrect: boolean } | null;
  draft: string;
};

export type SessionMachineEvent =
  | { type: 'RESTORE'; cursor: number; answeredQuestionIds: string[]; lastFeedbackCorrect?: boolean }
  | { type: 'SET_DRAFT'; value: string }
  | { type: 'ANSWER'; questionId: string; isCorrect: boolean }
  | { type: 'NEXT'; totalQuestions: number };

export function initialMachineState(): SessionMachineState {
  return {
    phase: 'question',
    cursor: 0,
    answeredQuestionIds: [],
    currentFeedback: null,
    draft: '',
  };
}

export function restoreMachine(
  questions: SessionQuestion[],
  answeredQuestionIds: string[],
): SessionMachineState {
  const answered = new Set(answeredQuestionIds);
  const firstUnanswered = questions.findIndex((question) => !answered.has(question.id));
  if (firstUnanswered === -1) {
    return {
      phase: 'summary',
      cursor: Math.max(0, questions.length - 1),
      answeredQuestionIds,
      currentFeedback: null,
      draft: '',
    };
  }

  return {
    phase: 'question',
    cursor: firstUnanswered,
    answeredQuestionIds,
    currentFeedback: null,
    draft: '',
  };
}

export class DoubleAnswerError extends Error {
  constructor(questionId: string) {
    super(`Question ${questionId} already has an answer`);
    this.name = 'DoubleAnswerError';
  }
}

export function reduceSession(
  state: SessionMachineState,
  event: SessionMachineEvent,
  questions: SessionQuestion[],
): SessionMachineState {
  switch (event.type) {
    case 'RESTORE': {
      if (event.lastFeedbackCorrect !== undefined && questions[event.cursor]) {
        const question = questions[event.cursor];
        const answeredCurrent = event.answeredQuestionIds.includes(question.id);
        if (answeredCurrent) {
          return {
            phase: 'feedback',
            cursor: event.cursor,
            answeredQuestionIds: event.answeredQuestionIds,
            currentFeedback: {
              questionId: question.id,
              isCorrect: event.lastFeedbackCorrect,
            },
            draft: '',
          };
        }
      }
      return restoreMachine(questions, event.answeredQuestionIds);
    }
    case 'SET_DRAFT':
      return { ...state, draft: event.value };
    case 'ANSWER': {
      if (state.phase !== 'question') {
        throw new DoubleAnswerError(event.questionId);
      }
      if (state.answeredQuestionIds.includes(event.questionId)) {
        throw new DoubleAnswerError(event.questionId);
      }
      const current = questions[state.cursor];
      if (!current || current.id !== event.questionId) {
        throw new DoubleAnswerError(event.questionId);
      }
      return {
        ...state,
        phase: 'feedback',
        answeredQuestionIds: [...state.answeredQuestionIds, event.questionId],
        currentFeedback: { questionId: event.questionId, isCorrect: event.isCorrect },
        draft: '',
      };
    }
    case 'NEXT': {
      if (state.phase !== 'feedback') return state;
      const nextCursor = state.cursor + 1;
      if (nextCursor >= event.totalQuestions) {
        return {
          ...state,
          phase: 'summary',
          currentFeedback: null,
        };
      }
      return {
        ...state,
        phase: 'question',
        cursor: nextCursor,
        currentFeedback: null,
        draft: '',
      };
    }
    default:
      return state;
  }
}
