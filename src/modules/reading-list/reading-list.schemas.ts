import { z } from 'zod';

export const readingListItemIdParamSchema = z.object({
  itemId: z.string().uuid('Reading-list item ID must be a valid UUID'),
});

export const addReadingListItemSchema = z
  .object({
    bookId: z.string().uuid('Book ID must be a valid UUID'),
  })
  .strict();

export const updateReadingListItemSchema = z
  .object({
    status: z.enum(['TO_READ', 'READING', 'COMPLETED']).optional(),
    notes: z.string().trim().max(2000, 'Notes are too long').nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update',
    path: [],
  });

export type AddReadingListItemInput = z.infer<typeof addReadingListItemSchema>;
export type UpdateReadingListItemInput = z.infer<typeof updateReadingListItemSchema>;
