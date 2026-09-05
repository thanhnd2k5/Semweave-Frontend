import { z } from 'zod';
import { FILL_IN_ANSWER_TRANSPORT_MAX_LENGTH } from '@/features/learning/grading/fill-in-blank.grader';

const isoDateTime = z
  .string()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'Invalid datetime' });

const uuid = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    'Invalid uuid',
  );

const quizTypeSchema = z.preprocess(
  (value) => (value === 'NUANCE' ? 'NUANCE_COMPARISON' : value),
  z.enum([
    'FILL_IN_BLANK',
    'DEFINITION_MATCH',
    'REVERSE_RECALL',
    'CONTEXT_SELECTION',
    'NUANCE_COMPARISON',
  ]),
);

const sessionTypeSchema = z.enum(['DUE_TODAY', 'WORD_TRIAL']);
const sessionStatusSchema = z.enum(['IN_PROGRESS', 'COMPLETED', 'ABANDONED']);

const optionSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
});

const questionSchema = z.object({
  id: z.string().min(1),
  position: z.number().int().nonnegative(),
  word: z.object({
    id: z.string().min(1),
    term: z.string().min(1),
    depthLevel: z.number().int().positive(),
  }),
  type: quizTypeSchema,
  question: z.string(),
  contextLabel: z.string().nullable(),
  options: z.array(optionSchema),
  correctAnswer: z.string(),
  acceptedVariants: z.array(z.string()),
  explanation: z.string(),
  difficulty: z.number(),
  gradingVersion: z.number().int().positive(),
});

export const sessionBundleSchema = z.object({
  id: z.string().min(1),
  clientSessionId: uuid,
  type: sessionTypeSchema,
  status: sessionStatusSchema,
  startedAt: isoDateTime,
  totalWords: z.number().int().nonnegative(),
  totalQuestions: z.number().int().nonnegative(),
  questions: z.array(questionSchema),
});

const summaryWordSchema = z.object({
  wordId: z.string().min(1),
  term: z.string().min(1),
  levelBefore: z.number().int(),
  levelAfter: z.number().int(),
  nextReviewAt: z.string().nullable(),
});

export const sessionSummarySchema = z.object({
  sessionId: z.string().min(1),
  type: sessionTypeSchema,
  status: sessionStatusSchema,
  totalWords: z.number().int().nonnegative(),
  totalQuestions: z.number().int().nonnegative(),
  answeredCount: z.number().int().nonnegative(),
  correctCount: z.number().int().nonnegative(),
  accuracy: z.number().nullable(),
  avgResponseTimeMs: z.number().int().nullable(),
  durationMs: z.number().int().nullable(),
  improvedWords: z.array(summaryWordSchema),
  reviewWords: z.array(summaryWordSchema),
  leveledUpWords: z.array(summaryWordSchema),
  skippedAttempts: z.array(
    z.object({
      sessionQuestionId: z.string(),
      reason: z.string(),
    }),
  ),
  nextDueAt: z.string().nullable(),
  syncedAt: z.string().nullable(),
});

export const sessionStatsSchema = z.object({
  asOf: z.string(),
  dueTodayCount: z.number().int().nonnegative(),
  nextDueAt: z.string().nullable(),
  totalLearningWords: z.number().int().nonnegative(),
  queueCount: z.number().int().nonnegative(),
  graduatedCount: z.number().int().nonnegative(),
  sessionWordCount: z.number().int().positive(),
  dailyNewWordLimit: z.object({
    limit: z.number().int(),
    used: z.number().int(),
    remaining: z.number().int(),
  }),
});

export const dueTodaySchema = z.object({
  asOf: z.string(),
  totalDue: z.number().int().nonnegative(),
  items: z.array(
    z.object({
      wordId: z.string().min(1),
      term: z.string().min(1),
      depthLevel: z.number().int().positive(),
      nextReviewAt: z.string(),
    }),
  ),
});

export const createSessionInputSchema = z
  .object({
    clientSessionId: uuid,
    type: sessionTypeSchema,
    wordId: z.string().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === 'WORD_TRIAL' && !value.wordId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'wordId is required for WORD_TRIAL',
        path: ['wordId'],
      });
    }
    if (value.type === 'DUE_TODAY' && value.wordId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'wordId is forbidden for DUE_TODAY',
        path: ['wordId'],
      });
    }
  });

const attemptAnswerSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('TEXT'), text: z.string().max(FILL_IN_ANSWER_TRANSPORT_MAX_LENGTH) }),
  z.object({ kind: z.literal('OPTION'), optionId: z.string().min(1) }),
]);

export const sessionAttemptSchema = z.object({
  clientAttemptId: uuid,
  sessionQuestionId: z.string().min(1),
  sequence: z.number().int().nonnegative(),
  answer: attemptAnswerSchema,
  responseTimeMs: z.number().int().min(0).max(1_800_000),
  attemptedAt: isoDateTime,
});

export const finalizeSessionInputSchema = z.object({
  syncId: uuid,
  finalizedAt: isoDateTime,
  attempts: z.array(sessionAttemptSchema).max(200),
});

export function parseSessionBundle(input: unknown) {
  return sessionBundleSchema.parse(input);
}

export function parseSessionSummary(input: unknown) {
  return sessionSummarySchema.parse(input);
}

export function parseSessionOrSummary(input: unknown) {
  const bundle = sessionBundleSchema.safeParse(input);
  if (bundle.success) return { kind: 'bundle' as const, data: bundle.data };
  const summary = sessionSummarySchema.safeParse(input);
  if (summary.success) return { kind: 'summary' as const, data: summary.data };
  throw bundle.error;
}
