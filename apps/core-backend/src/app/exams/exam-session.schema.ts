import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Offline exam prefetch schema - now returns encrypted content and signed license
export const prefetchExamSchema = z.object({
  examCode: z.string(),
});

// Remove the old requestDecryptionKeySchema and startExamSessionSchema since
// they are no longer needed with the new license-based approach

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

// New schema for getting client configuration (public key and license encryption key)
export const getClientConfigSchema = z.object({});

export class PrefetchExamDto extends createZodDto(prefetchExamSchema) {}
export class SubmitAnswerDto extends createZodDto(submitAnswerSchema) {}
export class EndExamSessionDto extends createZodDto(endExamSessionSchema) {}
export class SyncOfflineAnswersDto extends createZodDto(
  syncOfflineAnswersSchema
) {}
export class GetClientConfigDto extends createZodDto(getClientConfigSchema) {}
