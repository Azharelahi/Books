import type { NextFunction, Request, Response } from 'express';
import type { CreateCategoryInput, UpdateCategoryInput } from './categories.schemas.js';
import {
  createCategory,
  deleteCategory,
  getCategoryById,
  listCategories,
  updateCategory,
} from './categories.service.js';

export async function listCategoriesHandler(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const categories = await listCategories();
    response.status(200).json({ categories });
  } catch (error) {
    next(error);
  }
}

export async function getCategoryHandler(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { categoryId } = response.locals.validatedRequest.params as { categoryId: string };
    const category = await getCategoryById(categoryId);
    response.status(200).json({ category });
  } catch (error) {
    next(error);
  }
}

export async function createCategoryHandler(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = response.locals.validatedRequest.body as CreateCategoryInput;
    const category = await createCategory(input);
    response.status(201).json({ category });
  } catch (error) {
    next(error);
  }
}

export async function updateCategoryHandler(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { categoryId } = response.locals.validatedRequest.params as { categoryId: string };
    const input = response.locals.validatedRequest.body as UpdateCategoryInput;
    const category = await updateCategory(categoryId, input);
    response.status(200).json({ category });
  } catch (error) {
    next(error);
  }
}

export async function deleteCategoryHandler(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { categoryId } = response.locals.validatedRequest.params as { categoryId: string };
    await deleteCategory(categoryId);
    response.status(204).send();
  } catch (error) {
    next(error);
  }
}
