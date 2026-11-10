import { Prisma } from '../../generated/prisma/client.js';
import { loadConfig } from '../../config/env.js';
import { ApiError } from '../../lib/api-error.js';
import { createPrismaClient } from '../../lib/prisma.js';
import type { UpdateReadingListItemInput } from './reading-list.schemas.js';

const readingListInclude = {
  book: {
    include: {
      authors: { orderBy: { name: 'asc' as const } },
      categories: { orderBy: { name: 'asc' as const } },
    },
  },
};

export async function listReadingList(userId: string) {
  const prisma = createPrismaClient(loadConfig().DATABASE_URL);

  try {
    return await prisma.readingListEntry.findMany({
      where: { userId },
      include: readingListInclude,
      orderBy: { createdAt: 'desc' },
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function addReadingListItem(userId: string, bookId: string) {
  const prisma = createPrismaClient(loadConfig().DATABASE_URL);

  try {
    const bookExists = await prisma.book.findUnique({ where: { id: bookId }, select: { id: true } });
    if (!bookExists) {
      throw new ApiError(404, 'BOOK_NOT_FOUND', 'Book not found');
    }

    return await prisma.readingListEntry.create({
      data: { userId, bookId },
      include: readingListInclude,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ApiError(409, 'BOOK_ALREADY_IN_READING_LIST', 'This book is already in your reading list');
      }
      if (error.code === 'P2003') {
        throw new ApiError(404, 'USER_NOT_FOUND', 'Authenticated user no longer exists');
      }
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export async function updateReadingListItem(
  userId: string,
  itemId: string,
  input: UpdateReadingListItemInput,
) {
  const prisma = createPrismaClient(loadConfig().DATABASE_URL);

  try {
    const result = await prisma.readingListEntry.updateMany({
      where: { id: itemId, userId },
      data: input,
    });
    if (result.count === 0) {
      throw new ApiError(404, 'READING_LIST_ITEM_NOT_FOUND', 'Reading-list item not found');
    }

    const entry = await prisma.readingListEntry.findFirst({
      where: { id: itemId, userId },
      include: readingListInclude,
    });
    if (!entry) {
      throw new ApiError(404, 'READING_LIST_ITEM_NOT_FOUND', 'Reading-list item not found');
    }

    return entry;
  } finally {
    await prisma.$disconnect();
  }
}

export async function deleteReadingListItem(userId: string, itemId: string): Promise<void> {
  const prisma = createPrismaClient(loadConfig().DATABASE_URL);

  try {
    const result = await prisma.readingListEntry.deleteMany({ where: { id: itemId, userId } });
    if (result.count === 0) {
      throw new ApiError(404, 'READING_LIST_ITEM_NOT_FOUND', 'Reading-list item not found');
    }
  } finally {
    await prisma.$disconnect();
  }
}
