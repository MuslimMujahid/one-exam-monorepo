import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createExamFromCsvSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  examCode: z.string().trim().min(1),
  passKey: z.string().trim().min(1),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
});

export class CreateExamFromCsvDto extends createZodDto(
  createExamFromCsvSchema
) {}

// Schema for CSV row validation
export const csvQuestionRowSchema = z.object({
  text: z.string().trim().min(1, 'Question text cannot be empty'),
  questionType: z.enum(
    ['multiple-choice-single', 'multiple-choice-multiple', 'text'],
    {
      errorMap: () => ({
        message:
          'Question type must be one of: multiple-choice-single, multiple-choice-multiple, text',
      }),
    }
  ),
  options: z.string().optional().default(''), // JSON string that will be parsed
  points: z.preprocess((val) => {
    // Handle string numbers and clean up the value
    if (typeof val === 'string') {
      const trimmed = val.trim();
      const parsed = parseFloat(trimmed);
      return isNaN(parsed) ? val : parsed;
    }
    return val;
  }, z.number().int().min(1, 'Points must be a positive integer')),
});

export type CsvQuestionRow = z.infer<typeof csvQuestionRowSchema>;
