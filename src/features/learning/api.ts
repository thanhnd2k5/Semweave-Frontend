import { api } from '@/lib/api-client';
import {
  parseSessionBundle,
  parseSessionOrSummary,
  parseSessionSummary,
  sessionStatsSchema,
  dueTodaySchema,
  createSessionInputSchema,
  finalizeSessionInputSchema,
} from './schemas';
import type {
  CreateSessionInput,
  DueToday,
  FinalizeSessionInput,
  SessionBundle,
  SessionStats,
  SessionSummary,
} from './types';

export function getSessionStats(): Promise<SessionStats> {
  return api.get('/sessions/stats').then((data) => sessionStatsSchema.parse(data));
}

export function getDueToday(limit?: number): Promise<DueToday> {
  return api
    .get('/sessions/due-today', { params: limit ? { limit } : undefined })
    .then((data) => dueTodaySchema.parse(data));
}

export function createSession(input: CreateSessionInput): Promise<SessionBundle> {
  const body = createSessionInputSchema.parse(input);
  return api.post('/sessions', body).then((data) => parseSessionBundle(data));
}

export function getSession(sessionId: string): Promise<SessionBundle | SessionSummary> {
  return api.get(`/sessions/${sessionId}`).then((data) => {
    const parsed = parseSessionOrSummary(data);
    return parsed.data;
  });
}

export function completeSession(
  sessionId: string,
  input: FinalizeSessionInput,
): Promise<SessionSummary> {
  const body = finalizeSessionInputSchema.parse(input);
  return api.post(`/sessions/${sessionId}/complete`, body).then((data) => parseSessionSummary(data));
}

export function abandonSession(
  sessionId: string,
  input: FinalizeSessionInput,
): Promise<SessionSummary> {
  const body = finalizeSessionInputSchema.parse(input);
  return api.post(`/sessions/${sessionId}/abandon`, body).then((data) => parseSessionSummary(data));
}
