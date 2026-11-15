import { ApiError } from '../../lib/api-error.js';
import { prisma } from '../../lib/prisma.js';
import type { PaginationQuery } from '../../lib/pagination.js';
import type { UpdateReadingListItemInput } from './reading-list.schemas.js';

const readingListInclude = {
  book: {
    include: {
      authors: { orderBy: { name: 'asc' as const } },
      categories: { orderBy: { name: 'asc' as const } },
    },
  },
};

export async function listReadingList(userId: string, query: PaginationQuery) {
  const skip = (query.page - 1) * query.limit;
  const where = { userId };
  const [entries, total] = await prisma.$transaction([
    prisma.readingListEntry.findMany({ where, include: readingListInclude, orderBy: { createdAt: 'desc' }, skip, take: query.limit }),
    prisma.readingListEntry.count({ where }),
  ]);
  return { entries, pagination: { ...query, total, totalPages: Math.ceil(total / query.limit) } };
}

export async function addReadingListItem(userId: string, bookId: string) {
  const bookExists = await prisma.book.findUnique({ where: { id: bookId }, select: { id: true } });
  if (!bookExists) throw new ApiError(404, 'BOOK_NOT_FOUND', 'Book not found');
  return prisma.readingListEntry.create({ data: { userId, bookId }, include: readingListInclude });
}

export async function updateReadingListItem(userId: string, itemId: string, input: UpdateReadingListItemInput) {
  const result = await prisma.readingListEntry.updateMany({ where: { id: itemId, userId }, data: input });
  if (result.count === 0) throw new ApiError(404, 'READING_LIST_ITEM_NOT_FOUND', 'Reading-list item not found');
  const entry = await prisma.readingListEntry.findFirst({ where: { id: itemId, userId }, include: readingListInclude });
  if (!entry) throw new ApiError(404, 'READING_LIST_ITEM_NOT_FOUND', 'Reading-list item not found');
  return entry;
}

export async function deleteReadingListItem(userId: string, itemId: string): Promise<void> {
  const result = await prisma.readingListEntry.deleteMany({ where: { id: itemId, userId } });
  if (result.count === 0) throw new ApiError(404, 'READING_LIST_ITEM_NOT_FOUND', 'Reading-list item not found');
}
