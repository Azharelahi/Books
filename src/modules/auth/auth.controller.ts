import type { Request, Response } from 'express';
import type { ValidatedLocals } from '../../middleware/validate.js';
import { loginSchema, registerSchema } from './auth.schemas.js';
import { loginUser, registerUser } from './auth.service.js';

type RegisterLocals = ValidatedLocals<{ body: typeof registerSchema }>;
type LoginLocals = ValidatedLocals<{ body: typeof loginSchema }>;

export async function register(_request: Request, response: Response<unknown, RegisterLocals>): Promise<void> {
  const { email, password } = response.locals.validatedRequest.body;
  const user = await registerUser({ email, password });
  response.status(201).json({ user });
}

export async function login(_request: Request, response: Response<unknown, LoginLocals>): Promise<void> {
  const { email, password } = response.locals.validatedRequest.body;
  const payload = await loginUser({ email, password });
  response.status(200).json(payload);
}
