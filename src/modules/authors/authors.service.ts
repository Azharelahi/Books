import { ApiError } from '../../lib/api-error.js';
import { prisma } from '../../lib/prisma.js';
import type { PaginationQuery } from '../../lib/pagination.js';

export type AuthorRecord = {
  id: string;
  name: string;
  biography: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function listAuthors(query: PaginationQuery) {
  const skip = (query.page - 1) * query.limit;
  const [authors, total] = await prisma.$transaction([
    prisma.author.findMany({ orderBy: [{ name: 'asc' }, { id: 'asc' }], skip, take: query.limit }),
    prisma.author.count(),
  ]);
  return { authors, pagination: { ...query, total, totalPages: Math.ceil(total / query.limit) } };
}

export async function getAuthorById(authorId: string): Promise<AuthorRecord> {
  const author = await prisma.author.findUnique({ where: { id: authorId } });
  if (!author) throw new ApiError(404, 'AUTHOR_NOT_FOUND', 'Author not found');
  return author;
}

export async function createAuthor(input: { name: string; biography?: string | null }): Promise<AuthorRecord> {
  return prisma.author.create({ data: { name: input.name.trim(), biography: input.biography?.trim() || null } });
}

export async function updateAuthor(authorId: string, input: { name?: string; biography?: string | null }): Promise<AuthorRecord> {
  const data: { name?: string; biography?: string | null } = {};
  if (typeof input.name === 'string') data.name = input.name.trim();
  if (typeof input.biography === 'string') data.biography = input.biography.trim() || null;
  if (input.biography === null) data.biography = null;
  return prisma.author.update({ where: { id: authorId }, data });
}

export async function deleteAuthor(authorId: string): Promise<void> {
  await prisma.author.delete({ where: { id: authorId } });
}
