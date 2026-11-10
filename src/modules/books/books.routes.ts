import { Router } from 'express';
import { UserRole } from '../../generated/prisma/enums.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import {
  createBookHandler,
  deleteBookHandler,
  getBookHandler,
  listBooksHandler,
  updateBookHandler,
} from './books.controller.js';
import { bookIdParamSchema, createBookSchema, listBooksQuerySchema, updateBookSchema } from './books.schemas.js';

const booksRouter = Router();

booksRouter.get('/', validate({ query: listBooksQuerySchema }), listBooksHandler);
booksRouter.get('/:bookId', validate({ params: bookIdParamSchema }), getBookHandler);
booksRouter.post('/', authenticate, authorize(UserRole.ADMIN), validate({ body: createBookSchema }), createBookHandler);
booksRouter.patch(
  '/:bookId',
  authenticate,
  authorize(UserRole.ADMIN),
  validate({ params: bookIdParamSchema, body: updateBookSchema }),
  updateBookHandler,
);
booksRouter.delete('/:bookId', authenticate, authorize(UserRole.ADMIN), validate({ params: bookIdParamSchema }), deleteBookHandler);

export default booksRouter;
