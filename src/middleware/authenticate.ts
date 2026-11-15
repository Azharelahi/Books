import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../generated/prisma/enums.js';
import { config } from '../config/env.js';
import { ApiError } from '../lib/api-error.js';

export function authenticate(request: Request, _response: Response, next: NextFunction): void {
  const header = request.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    next(new ApiError(401, 'UNAUTHORIZED', 'Authentication required'));
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    next(new ApiError(401, 'UNAUTHORIZED', 'Authentication required'));
    return;
  }

  try {
    const payload = jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof payload === 'string' || typeof payload.sub !== 'string' ||
      typeof payload.email !== 'string' ||
      (payload.role !== UserRole.ADMIN && payload.role !== UserRole.USER)) {
      throw new Error('Token payload missing required claims');
    }

    request.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch {
    next(new ApiError(401, 'INVALID_TOKEN', 'Authentication failed'));
  }
}
