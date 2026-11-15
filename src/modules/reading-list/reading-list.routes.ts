import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import {
  addReadingListItemHandler,
  deleteReadingListItemHandler,
  listReadingListHandler,
  updateReadingListItemHandler,
} from './reading-list.controller.js';
import {
  addReadingListItemSchema,
  listReadingListQuerySchema,
  readingListItemIdParamSchema,
  updateReadingListItemSchema,
} from './reading-list.schemas.js';

const readingListRouter = Router();

readingListRouter.use(authenticate);
readingListRouter.get('/', validate({ query: listReadingListQuerySchema }), listReadingListHandler);
readingListRouter.post('/', validate({ body: addReadingListItemSchema }), addReadingListItemHandler);
readingListRouter.patch(
  '/:itemId',
  validate({ params: readingListItemIdParamSchema, body: updateReadingListItemSchema }),
  updateReadingListItemHandler,
);
readingListRouter.delete(
  '/:itemId',
  validate({ params: readingListItemIdParamSchema }),
  deleteReadingListItemHandler,
);

export default readingListRouter;
