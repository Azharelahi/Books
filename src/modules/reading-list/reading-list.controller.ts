import type { Request, Response } from 'express';
import { ApiError } from '../../lib/api-error.js';
import type { ValidatedLocals } from '../../middleware/validate.js';
import { addReadingListItemSchema, listReadingListQuerySchema, readingListItemIdParamSchema, updateReadingListItemSchema } from './reading-list.schemas.js';
import { addReadingListItem, deleteReadingListItem, listReadingList, updateReadingListItem } from './reading-list.service.js';

function getUserId(request: Request): string {
  if (!request.user) throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
  return request.user.id;
}

export async function listReadingListHandler(request: Request, response: Response<unknown, ValidatedLocals<{ query: typeof listReadingListQuerySchema }>>): Promise<void> {
  response.status(200).json(await listReadingList(getUserId(request), response.locals.validatedRequest.query));
}

export async function addReadingListItemHandler(request: Request, response: Response<unknown, ValidatedLocals<{ body: typeof addReadingListItemSchema }>>): Promise<void> {
  const { bookId } = response.locals.validatedRequest.body;
  const entry = await addReadingListItem(getUserId(request), bookId);
  response.status(201).json({ entry });
}

export async function updateReadingListItemHandler(request: Request, response: Response<unknown, ValidatedLocals<{ params: typeof readingListItemIdParamSchema; body: typeof updateReadingListItemSchema }>>): Promise<void> {
  const { itemId } = response.locals.validatedRequest.params;
  const entry = await updateReadingListItem(getUserId(request), itemId, response.locals.validatedRequest.body);
  response.status(200).json({ entry });
}

export async function deleteReadingListItemHandler(request: Request, response: Response<unknown, ValidatedLocals<{ params: typeof readingListItemIdParamSchema }>>): Promise<void> {
  const { itemId } = response.locals.validatedRequest.params;
  await deleteReadingListItem(getUserId(request), itemId);
  response.status(204).send();
}
