import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createUserSchema = z.object({
  auth0_sub: z.string().trim().min(1),
  email: z.string().trim().email().min(1),
  name: z.string().trim().min(1),
  role: z.string().trim().min(1),
});

export class CreateUserDto extends createZodDto(createUserSchema) {}
