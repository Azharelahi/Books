import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { loginRateLimit } from '../../middleware/login-rate-limit.js';
import { login, register } from './auth.controller.js';
import { loginSchema, registerSchema } from './auth.schemas.js';

const authRouter = Router();

authRouter.post('/register', validate({ body: registerSchema }), register);
authRouter.post('/login', loginRateLimit, validate({ body: loginSchema }), login);

export default authRouter;
