import type { NextFunction, Request, Response } from 'express';
import type { CreateBookInput, ListBooksQuery, UpdateBookInput } from './books.schemas.js';
import { createBook, deleteBook, getBookById, listBooks, updateBook } from './books.service.js';

export async function listBooksHandler(_request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await listBooks(response.locals.validatedRequest.query as ListBooksQuery);
    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getBookHandler(_request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const { bookId } = response.locals.validatedRequest.params as { bookId: string };
    const book = await getBookById(bookId);
    response.status(200).json({ book });
  } catch (error) {
    next(error);
  }
}

export async function createBookHandler(_request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const book = await createBook(response.locals.validatedRequest.body as CreateBookInput);
    response.status(201).json({ book });
  } catch (error) {
    next(error);
  }
}

export async function updateBookHandler(_request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const { bookId } = response.locals.validatedRequest.params as { bookId: string };
    const book = await updateBook(bookId, response.locals.validatedRequest.body as UpdateBookInput);
    response.status(200).json({ book });
  } catch (error) {
    next(error);
  }
}

export async function deleteBookHandler(_request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const { bookId } = response.locals.validatedRequest.params as { bookId: string };
    await deleteBook(bookId);
    response.status(204).send();
  } catch (error) {
    next(error);
  }
}
