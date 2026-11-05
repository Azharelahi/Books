import type { NextFunction, Request, Response } from 'express';
import { UserRole } from '../generated/prisma/enums.js';
import { ApiError } from '../lib/api-error.js';

export function authorize(...allowedRoles: UserRole[]) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    const user = request.user;

    if (!user) {
      next(new ApiError(401, 'UNAUTHORIZED', 'Authentication required'));
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      next(new ApiError(403, 'FORBIDDEN', 'You do not have permission to access this resource'));
      return;
    }

    next();
  };
}
