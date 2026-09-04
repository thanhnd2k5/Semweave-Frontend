import type { FinalizeSessionInput, FinalizationEndpoint } from '../types';

export function hashFinalizationPayload(
  endpoint: FinalizationEndpoint,
  payload: FinalizeSessionInput,
): string {
  const attempts = [...payload.attempts]
    .sort((a, b) => a.sequence - b.sequence)
    .map((attempt) => ({
      clientAttemptId: attempt.clientAttemptId,
      sessionQuestionId: attempt.sessionQuestionId,
      sequence: attempt.sequence,
      answer: attempt.answer,
      responseTimeMs: attempt.responseTimeMs,
      attemptedAt: attempt.attemptedAt,
    }));

  return JSON.stringify({
    endpoint,
    syncId: payload.syncId,
    finalizedAt: payload.finalizedAt,
    attempts,
  });
}
