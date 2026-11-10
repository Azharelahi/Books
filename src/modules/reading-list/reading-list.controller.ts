import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../../lib/api-error.js';
import type { AddReadingListItemInput, UpdateReadingListItemInput } from './reading-list.schemas.js';
import {
  addReadingListItem,
  deleteReadingListItem,
  listReadingList,
  updateReadingListItem,
} from './reading-list.service.js';

function getUserId(request: Request): string {
  if (!request.user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
  }
  return request.user.id;
}

export async function listReadingListHandler(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const entries = await listReadingList(getUserId(request));
    response.status(200).json({ entries });
  } catch (error) {
    next(error);
  }
}

export async function addReadingListItemHandler(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { bookId } = response.locals.validatedRequest.body as AddReadingListItemInput;
    const entry = await addReadingListItem(getUserId(request), bookId);
    response.status(201).json({ entry });
  } catch (error) {
    next(error);
  }
}

export async function updateReadingListItemHandler(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { itemId } = response.locals.validatedRequest.params as { itemId: string };
    const input = response.locals.validatedRequest.body as UpdateReadingListItemInput;
    const entry = await updateReadingListItem(getUserId(request), itemId, input);
    response.status(200).json({ entry });
  } catch (error) {
    next(error);
  }
}

export async function deleteReadingListItemHandler(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { itemId } = response.locals.validatedRequest.params as { itemId: string };
    await deleteReadingListItem(getUserId(request), itemId);
    response.status(204).send();
  } catch (error) {
    next(error);
  }
}
