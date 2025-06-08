import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const attachmentSchema = z.object({
  url: z.string().url(),
  filename: z.string().trim().min(1),
  mimeType: z.string().trim().min(1),
  size: z.number().int().min(1),
});

export const attachmentDto = createZodDto(attachmentSchema);
