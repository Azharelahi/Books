import { Prisma } from '../../generated/prisma/client.js';
import { ApiError } from '../../lib/api-error.js';
import { prisma } from '../../lib/prisma.js';
import type { CreateBookInput, ListBooksQuery, UpdateBookInput } from './books.schemas.js';

const bookInclude = {
  authors: { orderBy: { name: 'asc' as const } },
  categories: { orderBy: { name: 'asc' as const } },
};

async function validateReferences(authorIds: string[], categoryIds: string[]): Promise<void> {
  const [authors, categories] = await Promise.all([
    authorIds.length ? prisma.author.findMany({ where: { id: { in: authorIds } }, select: { id: true } }) : [],
    categoryIds.length ? prisma.category.findMany({ where: { id: { in: categoryIds } }, select: { id: true } }) : [],
  ]);
  const existingAuthorIds = new Set(authors.map((author) => author.id));
  const existingCategoryIds = new Set(categories.map((category) => category.id));
  const missingAuthorIds = [...new Set(authorIds)].filter((id) => !existingAuthorIds.has(id));
  const missingCategoryIds = [...new Set(categoryIds)].filter((id) => !existingCategoryIds.has(id));
  if (missingAuthorIds.length || missingCategoryIds.length) {
    throw new ApiError(400, 'INVALID_BOOK_RELATION', 'One or more related authors or categories do not exist', [
      ...missingAuthorIds.map((id) => ({ path: 'body.authorIds', message: `Author ${id} does not exist` })),
      ...missingCategoryIds.map((id) => ({ path: 'body.categoryIds', message: `Category ${id} does not exist` })),
    ]);
  }
}

export async function listBooks(query: ListBooksQuery) {
  const where: Prisma.BookWhereInput = {
    ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
    ...(query.authorId ? { authors: { some: { id: query.authorId } } } : {}),
    ...(query.categoryId ? { categories: { some: { id: query.categoryId } } } : {}),
  };
  const skip = (query.page - 1) * query.limit;
  const [books, total] = await prisma.$transaction([
    prisma.book.findMany({ where, include: bookInclude, orderBy: [{ title: 'asc' }, { id: 'asc' }], skip, take: query.limit }),
    prisma.book.count({ where }),
  ]);
  return { books, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}

export async function getBookById(bookId: string) {
  const book = await prisma.book.findUnique({ where: { id: bookId }, include: bookInclude });
  if (!book) throw new ApiError(404, 'BOOK_NOT_FOUND', 'Book not found');
  return book;
}

export async function createBook(input: CreateBookInput) {
  await validateReferences(input.authorIds, input.categoryIds);
  return prisma.book.create({
    data: {
      title: input.title,
      isbn: input.isbn ?? null,
      description: input.description ?? null,
      publishedAt: input.publishedAt ?? null,
      authors: { connect: input.authorIds.map((id) => ({ id })) },
      categories: { connect: input.categoryIds.map((id) => ({ id })) },
    },
    include: bookInclude,
  });
}

export async function updateBook(bookId: string, input: UpdateBookInput) {
  const data: Prisma.BookUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.isbn !== undefined) data.isbn = input.isbn;
  if (input.description !== undefined) data.description = input.description;
  if (input.publishedAt !== undefined) data.publishedAt = input.publishedAt;
  await validateReferences(input.authorIds ?? [], input.categoryIds ?? []);
  if (input.authorIds !== undefined) data.authors = { set: input.authorIds.map((id) => ({ id })) };
  if (input.categoryIds !== undefined) data.categories = { set: input.categoryIds.map((id) => ({ id })) };
  return prisma.book.update({ where: { id: bookId }, data, include: bookInclude });
}

export async function deleteBook(bookId: string): Promise<void> {
  await prisma.book.delete({ where: { id: bookId } });
}
