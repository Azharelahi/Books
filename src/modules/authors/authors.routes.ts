import { Router } from 'express';
import { UserRole } from '../../generated/prisma/enums.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import {
  createAuthorHandler,
  deleteAuthorHandler,
  getAuthorHandler,
  listAuthorsHandler,
  updateAuthorHandler,
} from './authors.controller.js';
import { authorIdParamSchema, createAuthorSchema, updateAuthorSchema } from './authors.schemas.js';

const authorsRouter = Router();

authorsRouter.get('/', listAuthorsHandler);
authorsRouter.get('/:authorId', validate({ params: authorIdParamSchema }), getAuthorHandler);
authorsRouter.post('/', authenticate, authorize(UserRole.ADMIN), validate({ body: createAuthorSchema }), createAuthorHandler);
authorsRouter.patch(
  '/:authorId',
  authenticate,
  authorize(UserRole.ADMIN),
  validate({ params: authorIdParamSchema, body: updateAuthorSchema }),
  updateAuthorHandler,
);
authorsRouter.delete(
  '/:authorId',
  authenticate,
  authorize(UserRole.ADMIN),
  validate({ params: authorIdParamSchema }),
  deleteAuthorHandler,
);

export default authorsRouter;
