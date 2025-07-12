import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Offline exam prefetch schema - now returns encrypted content and signed license
export const prefetchExamSchema = z.object({
  examCode: z.string(),
});

// Remove the old requestDecryptionKeySchema and startExamSessionSchema since
// they are no longer needed with the new license-based approach

export const submitAnswerSchema = z.object({
  examCode: z.string(), // Add exam code to identify which exam
  questionId: z.string().uuid(),
  answer: z.union([
    z.string(), // Text answer
    z.array(z.string()), // Multiple choice answers
    z.record(z.any()), // Complex answer structures
  ]),
  examStartTime: z.string().datetime(), // When the student started the exam locally
});

export const endExamSessionSchema = z.object({
  examCode: z.string(), // Change from sessionId to examCode since session may not exist yet
  examStartTime: z.string().datetime(), // When the student started the exam locally
});

// Sync offline answers schema
export const syncOfflineAnswersSchema = z.object({
  examCode: z.string(), // Change from sessionId to examCode since session may not exist yet
  examStartTime: z.string().datetime(), // When the student started the exam locally
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
