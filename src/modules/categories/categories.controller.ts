import type { Request, Response } from 'express';
import type { ValidatedLocals } from '../../middleware/validate.js';
import { paginationQuerySchema } from '../../lib/pagination.js';
import { categoryIdParamSchema, createCategorySchema, updateCategorySchema } from './categories.schemas.js';
import { createCategory, deleteCategory, getCategoryById, listCategories, updateCategory } from './categories.service.js';

export async function listCategoriesHandler(_request: Request, response: Response<unknown, ValidatedLocals<{ query: typeof paginationQuerySchema }>>): Promise<void> {
  response.status(200).json(await listCategories(response.locals.validatedRequest.query));
}

export async function getCategoryHandler(_request: Request, response: Response<unknown, ValidatedLocals<{ params: typeof categoryIdParamSchema }>>): Promise<void> {
  const { categoryId } = response.locals.validatedRequest.params;
  response.status(200).json({ category: await getCategoryById(categoryId) });
}

export async function createCategoryHandler(_request: Request, response: Response<unknown, ValidatedLocals<{ body: typeof createCategorySchema }>>): Promise<void> {
  response.status(201).json({ category: await createCategory(response.locals.validatedRequest.body) });
}

export async function updateCategoryHandler(_request: Request, response: Response<unknown, ValidatedLocals<{ params: typeof categoryIdParamSchema; body: typeof updateCategorySchema }>>): Promise<void> {
  const { categoryId } = response.locals.validatedRequest.params;
  response.status(200).json({ category: await updateCategory(categoryId, response.locals.validatedRequest.body) });
}

export async function deleteCategoryHandler(_request: Request, response: Response<unknown, ValidatedLocals<{ params: typeof categoryIdParamSchema }>>): Promise<void> {
  const { categoryId } = response.locals.validatedRequest.params;
  await deleteCategory(categoryId);
  response.status(204).send();
}
