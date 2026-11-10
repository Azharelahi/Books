import { Prisma } from '../../generated/prisma/client.js';
import { loadConfig } from '../../config/env.js';
import { ApiError } from '../../lib/api-error.js';
import { createPrismaClient } from '../../lib/prisma.js';

export type CategoryRecord = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function listCategories(): Promise<CategoryRecord[]> {
  const prisma = createPrismaClient(loadConfig().DATABASE_URL);

  try {
    return await prisma.category.findMany({ orderBy: { name: 'asc' } });
  } finally {
    await prisma.$disconnect();
  }
}

export async function getCategoryById(categoryId: string): Promise<CategoryRecord> {
  const prisma = createPrismaClient(loadConfig().DATABASE_URL);

  try {
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      throw new ApiError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
    }

    return category;
  } finally {
    await prisma.$disconnect();
  }
}

export async function createCategory(input: { name: string; slug: string }): Promise<CategoryRecord> {
  const prisma = createPrismaClient(loadConfig().DATABASE_URL);

  try {
    return await prisma.category.create({ data: input });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ApiError(409, 'CATEGORY_ALREADY_EXISTS', 'A category with this name or slug already exists');
    }

    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export async function updateCategory(
  categoryId: string,
  input: { name?: string; slug?: string },
): Promise<CategoryRecord> {
  const prisma = createPrismaClient(loadConfig().DATABASE_URL);

  try {
    return await prisma.category.update({ where: { id: categoryId }, data: input });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        throw new ApiError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
      }
      if (error.code === 'P2002') {
        throw new ApiError(409, 'CATEGORY_ALREADY_EXISTS', 'A category with this name or slug already exists');
      }
    }

    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const prisma = createPrismaClient(loadConfig().DATABASE_URL);

  try {
    await prisma.category.delete({ where: { id: categoryId } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new ApiError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
    }

    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
