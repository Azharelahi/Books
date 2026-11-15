import type { Request, Response } from 'express';
import type { ValidatedLocals } from '../../middleware/validate.js';
import { bookIdParamSchema, createBookSchema, listBooksQuerySchema, updateBookSchema } from './books.schemas.js';
import { createBook, deleteBook, getBookById, listBooks, updateBook } from './books.service.js';

export async function listBooksHandler(_request: Request, response: Response<unknown, ValidatedLocals<{ query: typeof listBooksQuerySchema }>>): Promise<void> {
  response.status(200).json(await listBooks(response.locals.validatedRequest.query));
}

export async function getBookHandler(_request: Request, response: Response<unknown, ValidatedLocals<{ params: typeof bookIdParamSchema }>>): Promise<void> {
  const { bookId } = response.locals.validatedRequest.params;
  response.status(200).json({ book: await getBookById(bookId) });
}

export async function createBookHandler(_request: Request, response: Response<unknown, ValidatedLocals<{ body: typeof createBookSchema }>>): Promise<void> {
  response.status(201).json({ book: await createBook(response.locals.validatedRequest.body) });
}

export async function updateBookHandler(_request: Request, response: Response<unknown, ValidatedLocals<{ params: typeof bookIdParamSchema; body: typeof updateBookSchema }>>): Promise<void> {
  const { bookId } = response.locals.validatedRequest.params;
  response.status(200).json({ book: await updateBook(bookId, response.locals.validatedRequest.body) });
}

export async function deleteBookHandler(_request: Request, response: Response<unknown, ValidatedLocals<{ params: typeof bookIdParamSchema }>>): Promise<void> {
  const { bookId } = response.locals.validatedRequest.params;
  await deleteBook(bookId);
  response.status(204).send();
}
