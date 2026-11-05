import type { ErrorRequestHandler } from 'express';
import { Prisma } from '../generated/prisma/client.js';
import { ZodError } from 'zod';
import { ApiError } from '../lib/api-error.js';

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof ApiError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const mappedError = mapPrismaError(error);
    response.status(mappedError.statusCode).json({
      error: {
        code: mappedError.code,
        message: mappedError.message,
        details: mappedError.details,
      },
    });
    return;
  }

  if (isMalformedJsonError(error)) {
    response.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Request body contains invalid JSON',
        details: [],
      },
    });
    return;
  }

  console.error('Unhandled request error:', error);
  response.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      details: [],
    },
  });
};

function isMalformedJsonError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    error.type === 'entity.parse.failed'
  );
}

function mapPrismaError(error: Prisma.PrismaClientKnownRequestError): {
  statusCode: number;
  code: string;
  message: string;
  details: Array<{ path: string; message: string }>;
} {
  switch (error.code) {
    case 'P2002': {
      const target = Array.isArray(error.meta?.target)
        ? String(error.meta.target.join('.'))
        : typeof error.meta?.target === 'string'
          ? error.meta.target
          : 'value';

      return {
        statusCode: 409,
        code: 'RESOURCE_CONFLICT',
        message: 'A resource with the same value already exists',
        details: [{ path: target, message: 'This value must be unique' }],
      };
    }
    case 'P2003':
      return {
        statusCode: 400,
        code: 'FOREIGN_KEY_CONSTRAINT',
        message: 'The referenced resource does not exist',
        details: [],
      };
    case 'P2001':
    case 'P2025':
      return {
        statusCode: 404,
        code: 'RESOURCE_NOT_FOUND',
        message: 'The requested resource was not found',
        details: [],
      };
    case 'P2014':
    case 'P2015':
    case 'P2000':
      return {
        statusCode: 400,
        code: 'INVALID_DATABASE_OPERATION',
        message: 'The database rejected the operation',
        details: [],
      };
    default:
      return {
        statusCode: 400,
        code: 'DATABASE_ERROR',
        message: 'A database error occurred',
        details: [],
      };
  }
}
