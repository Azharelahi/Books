import type { NextFunction, Request, Response } from 'express';
import type { RegisterInput } from './auth.schemas.js';
import { registerUser } from './auth.service.js';

export async function register(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = response.locals.validatedRequest.body as RegisterInput;
    const user = await registerUser({ email, password });

    response.status(201).json({ user });
  } catch (error) {
    next(error);
  }
}
