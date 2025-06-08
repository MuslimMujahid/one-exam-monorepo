import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { attachmentSchema } from '../attachments/attachment.schema';

const baseSchema = z.object({
  text: z.string().trim().min(1),
  questionType: z
    .enum(['multiple-choice-single', 'multiple-choice-multiple', 'text'])
    .default('text'),
  attachments: z.array(attachmentSchema).optional(),
  points: z.number().int().min(1).default(1),
});

const optionsSchema = z
  .array(z.object({ value: z.string().trim().min(1), isCorrect: z.boolean() }))
  .min(2)
  .optional();

// Individual schemas for each question type
export const multipleChoiceSingleSchema = baseSchema.extend({
  questionType: z.literal('multiple-choice-single'),
  options: optionsSchema,
});

export const multipleChoiceMultipleSchema = baseSchema.extend({
  questionType: z.literal('multiple-choice-multiple'),
  options: optionsSchema,
});

export const textQuestionSchema = baseSchema.extend({
  questionType: z.literal('text'),
});

// Discriminated union for validation
export const questionSchema = z.discriminatedUnion('questionType', [
  multipleChoiceSingleSchema,
  multipleChoiceMultipleSchema,
  textQuestionSchema,
]);

// Individual DTOs
export class MultipleChoiceSingleDto extends createZodDto(
  multipleChoiceSingleSchema
) {}
export class MultipleChoiceMultipleDto extends createZodDto(
  multipleChoiceMultipleSchema
) {}
export class TextQuestionDto extends createZodDto(textQuestionSchema) {}

// Union type for TypeScript
export type QuestionDto =
  | MultipleChoiceSingleDto
  | MultipleChoiceMultipleDto
  | TextQuestionDto;
