import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { register } from './auth.controller.js';
import { registerSchema } from './auth.schemas.js';

const authRouter = Router();

authRouter.post('/register', validate({ body: registerSchema }), register);

export default authRouter;
