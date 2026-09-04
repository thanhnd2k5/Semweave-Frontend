export type QuizType =
  | 'FILL_IN_BLANK'
  | 'DEFINITION_MATCH'
  | 'REVERSE_RECALL'
  | 'CONTEXT_SELECTION'
  | 'NUANCE_COMPARISON';

export type StudySessionType = 'DUE_TODAY' | 'WORD_TRIAL';

export type StudySessionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';

export type QuizAnswerKind = 'TEXT' | 'OPTION';

export type SessionQuestionOption = {
  id: string;
  text: string;
};

export type SessionQuestion = {
  id: string;
  position: number;
  word: { id: string; term: string; depthLevel: number };
  type: QuizType;
  question: string;
  contextLabel: string | null;
  options: SessionQuestionOption[];
  correctAnswer: string;
  acceptedVariants: string[];
  explanation: string;
  difficulty: number;
  gradingVersion: number;
};

export type SessionBundle = {
  id: string;
  clientSessionId: string;
  type: StudySessionType;
  status: StudySessionStatus;
  startedAt: string;
  totalWords: number;
  totalQuestions: number;
  questions: SessionQuestion[];
};

export type SessionSummaryWord = {
  wordId: string;
  term: string;
  levelBefore: number;
  levelAfter: number;
  nextReviewAt: string | null;
};

export type SessionSummary = {
  sessionId: string;
  type: StudySessionType;
  status: StudySessionStatus;
  totalWords: number;
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  accuracy: number | null;
  avgResponseTimeMs: number | null;
  durationMs: number | null;
  improvedWords: SessionSummaryWord[];
  reviewWords: SessionSummaryWord[];
  leveledUpWords: SessionSummaryWord[];
  skippedAttempts: Array<{ sessionQuestionId: string; reason: string }>;
  nextDueAt: string | null;
  syncedAt: string | null;
};

export type SessionStats = {
  asOf: string;
  dueTodayCount: number;
  nextDueAt: string | null;
  totalLearningWords: number;
  queueCount: number;
  graduatedCount: number;
  sessionWordCount: number;
  dailyNewWordLimit: {
    limit: number;
    used: number;
    remaining: number;
  };
};

export type DueTodayItem = {
  wordId: string;
  term: string;
  depthLevel: number;
  nextReviewAt: string;
};

export type DueToday = {
  asOf: string;
  totalDue: number;
  items: DueTodayItem[];
};

export type CreateSessionInput = {
  clientSessionId: string;
  type: StudySessionType;
  wordId?: string;
};

export type SessionAttemptAnswer =
  | { kind: 'TEXT'; text: string }
  | { kind: 'OPTION'; optionId: string };

export type SessionAttempt = {
  clientAttemptId: string;
  sessionQuestionId: string;
  sequence: number;
  answer: SessionAttemptAnswer;
  responseTimeMs: number;
  attemptedAt: string;
};

export type FinalizeSessionInput = {
  syncId: string;
  finalizedAt: string;
  attempts: SessionAttempt[];
};

export type FinalizationEndpoint = 'COMPLETE' | 'ABANDON';

export type LocalSessionStatus =
  | 'IN_PROGRESS'
  | 'PENDING_COMPLETE'
  | 'PENDING_ABANDON'
  | 'SYNCED_COMPLETE'
  | 'SYNCED_ABANDON';

export type LocalGrade = {
  isCorrect: boolean;
  matchedVariant: string | null;
};

export type StoredSessionAttempt = SessionAttempt & {
  ownerId: string;
  sessionId: string;
  localGrade: LocalGrade;
};

export type TimerSnapshot = {
  elapsedMs: number;
  runningSince: number | null;
  sessionElapsedMs: number;
};

export type SessionSnapshotRecord = {
  ownerId: string;
  sessionId: string;
  bundle: SessionBundle;
  cursor: number;
  localStatus: LocalSessionStatus;
  timer: TimerSnapshot;
  createdAt: string;
  updatedAt: string;
  canonicalSummary?: SessionSummary | null;
};

export type SyncOperationStatus = 'PENDING' | 'IN_FLIGHT' | 'SYNCED' | 'CONFLICT' | 'FAILED';

export type SessionSyncOperation = {
  ownerId: string;
  sessionId: string;
  syncId: string;
  endpoint: FinalizationEndpoint;
  payload: FinalizeSessionInput;
  payloadHash: string;
  retryCount: number;
  nextRetryAt: number;
  lastError: string | null;
  status: SyncOperationStatus;
  leaseOwner: string | null;
  leaseExpiresAt: number | null;
};
