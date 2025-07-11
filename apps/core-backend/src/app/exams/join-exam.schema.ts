import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const joinExamSchema = z.object({
  examCode: z.string().trim().min(1),
  passKey: z.string().trim().min(1),
});

export class JoinExamDto extends createZodDto(joinExamSchema) {}
