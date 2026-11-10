import { Router } from 'express';
import { UserRole } from '../../generated/prisma/enums.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import {
  createCategoryHandler,
  deleteCategoryHandler,
  getCategoryHandler,
  listCategoriesHandler,
  updateCategoryHandler,
} from './categories.controller.js';
import {
  categoryIdParamSchema,
  createCategorySchema,
  updateCategorySchema,
} from './categories.schemas.js';

const categoriesRouter = Router();

categoriesRouter.get('/', listCategoriesHandler);
categoriesRouter.get('/:categoryId', validate({ params: categoryIdParamSchema }), getCategoryHandler);
categoriesRouter.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN),
  validate({ body: createCategorySchema }),
  createCategoryHandler,
);
categoriesRouter.patch(
  '/:categoryId',
  authenticate,
  authorize(UserRole.ADMIN),
  validate({ params: categoryIdParamSchema, body: updateCategorySchema }),
  updateCategoryHandler,
);
categoriesRouter.delete(
  '/:categoryId',
  authenticate,
  authorize(UserRole.ADMIN),
  validate({ params: categoryIdParamSchema }),
  deleteCategoryHandler,
);

export default categoriesRouter;
