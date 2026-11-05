import type { NextFunction, Request, Response } from 'express';
import type { CreateAuthorInput, UpdateAuthorInput } from './authors.schemas.js';
import { createAuthor, deleteAuthor, getAuthorById, listAuthors, updateAuthor } from './authors.service.js';

export async function listAuthorsHandler(_request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const authors = await listAuthors();
    response.status(200).json({ authors });
  } catch (error) {
    next(error);
  }
}

export async function getAuthorHandler(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const { authorId } = response.locals.validatedRequest.params as { authorId: string };
    const author = await getAuthorById(authorId);
    response.status(200).json({ author });
  } catch (error) {
    next(error);
  }
}

export async function createAuthorHandler(_request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const { name, biography } = response.locals.validatedRequest.body as CreateAuthorInput;
    const author = await createAuthor({ name, biography });
    response.status(201).json({ author });
  } catch (error) {
    next(error);
  }
}

export async function updateAuthorHandler(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const { authorId } = response.locals.validatedRequest.params as { authorId: string };
    const update = response.locals.validatedRequest.body as UpdateAuthorInput;
    const author = await updateAuthor(authorId, update);
    response.status(200).json({ author });
  } catch (error) {
    next(error);
  }
}

export async function deleteAuthorHandler(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const { authorId } = response.locals.validatedRequest.params as { authorId: string };
    await deleteAuthor(authorId);
    response.status(204).send();
  } catch (error) {
    next(error);
  }
}
