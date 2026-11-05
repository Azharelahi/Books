import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../generated/prisma/enums.js';
import { loadConfig } from '../config/env.js';
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
    const config = loadConfig();
    const payload = jwt.verify(token, config.JWT_SECRET) as jwt.JwtPayload & {
      sub?: string;
      email?: string;
      role?: UserRole;
    };

    const userId = payload.sub ?? payload.userId ?? payload.id;
    const email = payload.email;
    const role = payload.role ?? UserRole.USER;

    if (!userId || !email) {
      throw new Error('Token payload missing user identity');
    }

    request.user = {
      id: String(userId),
      email: String(email),
      role: role as UserRole,
    };
    next();
  } catch {
    next(new ApiError(401, 'INVALID_TOKEN', 'Authentication failed'));
  }
}
