import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';
import { ApiError } from '../lib/api-error.js';

type RequestSchemas = {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
};

export type ValidatedRequest = {
  body?: unknown;
  params?: unknown;
  query?: unknown;
};

export const validate = (schemas: RequestSchemas): RequestHandler => {
  return (request: Request, response: Response, next: NextFunction) => {
    const validated: ValidatedRequest = {};

    for (const target of ['params', 'query', 'body'] as const) {
      const schema = schemas[target];
      if (!schema) continue;

      const result = schema.safeParse(request[target]);
      if (!result.success) {
        const details = result.error.issues.map((issue) => ({
          path: [target, ...issue.path].join('.'),
          message: issue.message,
        }));
        return next(new ApiError(400, 'VALIDATION_ERROR', 'Request validation failed', details));
      }

      validated[target] = result.data;
    }

    response.locals.validatedRequest = validated;
    next();
  };
};
