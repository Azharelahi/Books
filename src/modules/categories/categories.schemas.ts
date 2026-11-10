import { z } from 'zod';

const nameSchema = z.string().trim().min(1, 'Name is required').max(100, 'Name is too long');
const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Slug is required')
  .max(120, 'Slug is too long')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug may contain lowercase letters, numbers, and single hyphens');

export const categoryIdParamSchema = z.object({
  categoryId: z.string().uuid('Category ID must be a valid UUID'),
});

export const createCategorySchema = z
  .object({
    name: nameSchema,
    slug: slugSchema,
  })
  .strict();

export const updateCategorySchema = z
  .object({
    name: nameSchema.optional(),
    slug: slugSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update',
    path: [],
  });

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
