import { z } from 'zod';

export const authorIdParamSchema = z.object({
  authorId: z.string().uuid('Author ID must be a valid UUID'),
});

export const createAuthorSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(200, 'Name is too long'),
    biography: z
      .string()
      .trim()
      .max(5000, 'Biography is too long')
      .optional()
      .nullable(),
  })
  .strict();

export const updateAuthorSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(200, 'Name is too long').optional(),
    biography: z
      .string()
      .trim()
      .max(5000, 'Biography is too long')
      .optional()
      .nullable(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update',
    path: [],
  });

export type AuthorIdParams = z.infer<typeof authorIdParamSchema>;
export type CreateAuthorInput = z.infer<typeof createAuthorSchema>;
export type UpdateAuthorInput = z.infer<typeof updateAuthorSchema>;
