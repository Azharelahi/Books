import type { RequestHandler } from 'express';
import { ApiError } from '../lib/api-error.js';

export const notFound: RequestHandler = (request, _response, next) => {
  next(new ApiError(404, 'NOT_FOUND', `Route not found: ${request.method} ${request.path}`));
};
