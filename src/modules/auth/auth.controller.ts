import type { NextFunction, Request, Response } from 'express';
import type { LoginInput, RegisterInput } from './auth.schemas.js';
import { loginUser, registerUser } from './auth.service.js';

export async function register(_request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = response.locals.validatedRequest.body as RegisterInput;
    const user = await registerUser({ email, password });

    response.status(201).json({ user });
  } catch (error) {
    next(error);
  }
}

export async function login(_request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = response.locals.validatedRequest.body as LoginInput;
    const payload = await loginUser({ email, password });

    response.status(200).json(payload);
  } catch (error) {
    next(error);
  }
}
