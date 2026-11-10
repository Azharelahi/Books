import { z } from 'zod';

const uuidList = z.array(z.string().uuid()).max(50, 'At most 50 related IDs may be provided');
const titleSchema = z.string().trim().min(1, 'Title is required').max(255, 'Title is too long');
const isbnSchema = z
  .string()
  .trim()
  .max(17, 'ISBN is too long')
  .regex(/^(?:[0-9]{9}[0-9X]|[0-9]{13})$/, 'ISBN must be ISBN-10 or ISBN-13')
  .nullable();
const dateSchema = z.iso.date().transform((value) => new Date(`${value}T00:00:00.000Z`)).nullable();

export const bookIdParamSchema = z.object({
  bookId: z.string().uuid('Book ID must be a valid UUID'),
});

export const listBooksQuerySchema = z
  .object({
    search: z.string().trim().min(1).max(100).optional(),
    authorId: z.string().uuid().optional(),
    categoryId: z.string().uuid().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const createBookSchema = z
  .object({
    title: titleSchema,
    isbn: isbnSchema.optional(),
    description: z.string().trim().max(10000, 'Description is too long').nullable().optional(),
    publishedAt: dateSchema.optional(),
    authorIds: uuidList.optional().default([]),
    categoryIds: uuidList.optional().default([]),
  })
  .strict();

export const updateBookSchema = z
  .object({
    title: titleSchema.optional(),
    isbn: isbnSchema.optional(),
    description: z.string().trim().max(10000, 'Description is too long').nullable().optional(),
    publishedAt: dateSchema.optional(),
    authorIds: uuidList.optional(),
    categoryIds: uuidList.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update',
    path: [],
  });

export type ListBooksQuery = z.infer<typeof listBooksQuerySchema>;
export type CreateBookInput = z.infer<typeof createBookSchema>;
export type UpdateBookInput = z.infer<typeof updateBookSchema>;
