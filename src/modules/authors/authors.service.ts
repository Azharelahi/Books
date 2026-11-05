import { Prisma } from '../../generated/prisma/client.js';
import { loadConfig } from '../../config/env.js';
import { ApiError } from '../../lib/api-error.js';
import { createPrismaClient } from '../../lib/prisma.js';

export type AuthorRecord = {
  id: string;
  name: string;
  biography: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function listAuthors(): Promise<AuthorRecord[]> {
  const prisma = createPrismaClient(loadConfig().DATABASE_URL);

  try {
    return await prisma.author.findMany({
      orderBy: { name: 'asc' },
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function getAuthorById(authorId: string): Promise<AuthorRecord> {
  const prisma = createPrismaClient(loadConfig().DATABASE_URL);

  try {
    const author = await prisma.author.findUnique({ where: { id: authorId } });
    if (!author) {
      throw new ApiError(404, 'AUTHOR_NOT_FOUND', 'Author not found');
    }

    return author;
  } finally {
    await prisma.$disconnect();
  }
}

export async function createAuthor(input: { name: string; biography?: string | null }): Promise<AuthorRecord> {
  const prisma = createPrismaClient(loadConfig().DATABASE_URL);

  try {
    return await prisma.author.create({
      data: {
        name: input.name.trim(),
        biography: input.biography?.trim() || null,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ApiError(409, 'AUTHOR_ALREADY_EXISTS', 'An author with this value already exists');
    }

    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export async function updateAuthor(authorId: string, input: { name?: string; biography?: string | null }): Promise<AuthorRecord> {
  const prisma = createPrismaClient(loadConfig().DATABASE_URL);

  const data: { name?: string; biography?: string | null } = {};
  if (typeof input.name === 'string') {
    data.name = input.name.trim();
  }
  if (typeof input.biography === 'string') {
    data.biography = input.biography.trim() || null;
  }
  if (input.biography === null) {
    data.biography = null;
  }

  try {
    return await prisma.author.update({
      where: { id: authorId },
      data,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        throw new ApiError(404, 'AUTHOR_NOT_FOUND', 'Author not found');
      }
      if (error.code === 'P2002') {
        throw new ApiError(409, 'AUTHOR_ALREADY_EXISTS', 'An author with this value already exists');
      }
    }

    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export async function deleteAuthor(authorId: string): Promise<void> {
  const prisma = createPrismaClient(loadConfig().DATABASE_URL);

  try {
    await prisma.author.delete({ where: { id: authorId } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new ApiError(404, 'AUTHOR_NOT_FOUND', 'Author not found');
    }

    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
