import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const startExamSessionSchema = z.object({
  examId: z.string().uuid(),
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

export class StartExamSessionDto extends createZodDto(startExamSessionSchema) {}
export class SubmitAnswerDto extends createZodDto(submitAnswerSchema) {}
export class EndExamSessionDto extends createZodDto(endExamSessionSchema) {}
