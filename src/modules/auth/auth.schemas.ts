import { z } from 'zod';

export const registerSchema = z
  .object({
    email: z.string().trim().email('Email must be a valid email address').max(320, 'Email is too long'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password is too long'),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
