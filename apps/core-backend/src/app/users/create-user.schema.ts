import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().trim().email().min(1),
  name: z.string().trim().min(1),
  role: z.enum(['STUDENT', 'TEACHER']).default('STUDENT'),
  password: z
    .string()
    .trim()
    .min(6, 'Password must be at least 6 characters long'),
});

export class CreateUserDto extends createZodDto(createUserSchema) {}
