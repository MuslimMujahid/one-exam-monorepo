import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Offline exam prefetch schema
export const prefetchExamSchema = z.object({
  examCode: z.string(),
});

// Request encryption key schema
export const requestDecryptionKeySchema = z.object({
  examCode: z.string(),
  deviceId: z.string(),
});

// Start offline exam session schema
export const startExamSessionSchema = z.object({
  examCode: z.string(),
  decryptionKey: z.string(),
});

export const submitAnswerSchema = z.object({
  questionId: z.string().uuid(),
  answer: z.union([
    z.string(), // Text answer
    z.array(z.string()), // Multiple choice answers
    z.record(z.any()), // Complex answer structures
  ]),
});

export const endExamSessionSchema = z.object({
  sessionId: z.string().uuid(),
});

// Sync offline answers schema
export const syncOfflineAnswersSchema = z.object({
  sessionId: z.string().uuid(),
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      answer: z.union([z.string(), z.array(z.string()), z.record(z.any())]),
      submittedAt: z.string().datetime(),
    })
  ),
});

export class PrefetchExamDto extends createZodDto(prefetchExamSchema) {}
export class RequestDecryptionKeyDto extends createZodDto(
  requestDecryptionKeySchema
) {}
export class StartExamSessionDto extends createZodDto(startExamSessionSchema) {}
export class SubmitAnswerDto extends createZodDto(submitAnswerSchema) {}
export class EndExamSessionDto extends createZodDto(endExamSessionSchema) {}
export class SyncOfflineAnswersDto extends createZodDto(
  syncOfflineAnswersSchema
) {}
