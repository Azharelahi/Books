import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';
import { ApiError } from '../lib/api-error.js';

export type RequestSchemas = {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
};

export type ValidatedRequest<S extends RequestSchemas> = {
  [K in keyof S]: S[K] extends ZodType ? ReturnType<S[K]['parse']> : never;
};

export type ValidatedLocals<S extends RequestSchemas> = {
  validatedRequest: ValidatedRequest<S>;
};

export function validate<S extends RequestSchemas>(schemas: S): RequestHandler {
  return (request: Request, response: Response, next: NextFunction) => {
    const validated: Partial<Record<keyof RequestSchemas, unknown>> = {};

    for (const target of ['params', 'query', 'body'] as const) {
      const schema = schemas[target];
      if (!schema) continue;

      const result = schema.safeParse(request[target]);
      if (!result.success) {
        const details = result.error.issues.map((issue) => ({
          path: [target, ...issue.path].join('.'),
          message: issue.message,
        }));
        next(new ApiError(400, 'VALIDATION_ERROR', 'Request validation failed', details));
        return;
      }

      validated[target] = result.data;
    }

    response.locals.validatedRequest = validated as ValidatedRequest<S>;
    next();
  };
}
