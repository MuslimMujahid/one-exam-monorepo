import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { questionSchema } from './question.schema';

export const createExamSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  invitationCode: z.string().trim().min(1),
  questions: z.array(questionSchema),
});

export class CreateExamDto extends createZodDto(createExamSchema) {}
