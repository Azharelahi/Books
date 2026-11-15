import type { Request, Response } from 'express';
import type { ValidatedLocals } from '../../middleware/validate.js';
import { paginationQuerySchema } from '../../lib/pagination.js';
import { authorIdParamSchema, createAuthorSchema, updateAuthorSchema } from './authors.schemas.js';
import { createAuthor, deleteAuthor, getAuthorById, listAuthors, updateAuthor } from './authors.service.js';

export async function listAuthorsHandler(_request: Request, response: Response<unknown, ValidatedLocals<{ query: typeof paginationQuerySchema }>>): Promise<void> {
  response.status(200).json(await listAuthors(response.locals.validatedRequest.query));
}

export async function getAuthorHandler(_request: Request, response: Response<unknown, ValidatedLocals<{ params: typeof authorIdParamSchema }>>): Promise<void> {
  const { authorId } = response.locals.validatedRequest.params;
  response.status(200).json({ author: await getAuthorById(authorId) });
}

export async function createAuthorHandler(_request: Request, response: Response<unknown, ValidatedLocals<{ body: typeof createAuthorSchema }>>): Promise<void> {
  response.status(201).json({ author: await createAuthor(response.locals.validatedRequest.body) });
}

export async function updateAuthorHandler(_request: Request, response: Response<unknown, ValidatedLocals<{ params: typeof authorIdParamSchema; body: typeof updateAuthorSchema }>>): Promise<void> {
  const { authorId } = response.locals.validatedRequest.params;
  response.status(200).json({ author: await updateAuthor(authorId, response.locals.validatedRequest.body) });
}

export async function deleteAuthorHandler(_request: Request, response: Response<unknown, ValidatedLocals<{ params: typeof authorIdParamSchema }>>): Promise<void> {
  const { authorId } = response.locals.validatedRequest.params;
  await deleteAuthor(authorId);
  response.status(204).send();
}
