import { ApiError } from '../../lib/api-error.js';
import { prisma } from '../../lib/prisma.js';
import type { PaginationQuery } from '../../lib/pagination.js';

export type CategoryRecord = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function listCategories(query: PaginationQuery) {
  const skip = (query.page - 1) * query.limit;
  const [categories, total] = await prisma.$transaction([
    prisma.category.findMany({ orderBy: [{ name: 'asc' }, { id: 'asc' }], skip, take: query.limit }),
    prisma.category.count(),
  ]);
  return { categories, pagination: { ...query, total, totalPages: Math.ceil(total / query.limit) } };
}

export async function getCategoryById(categoryId: string): Promise<CategoryRecord> {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) throw new ApiError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
  return category;
}

export async function createCategory(input: { name: string; slug: string }): Promise<CategoryRecord> {
  return prisma.category.create({ data: input });
}

export async function updateCategory(categoryId: string, input: { name?: string; slug?: string }): Promise<CategoryRecord> {
  return prisma.category.update({ where: { id: categoryId }, data: input });
}

export async function deleteCategory(categoryId: string): Promise<void> {
  await prisma.category.delete({ where: { id: categoryId } });
}
