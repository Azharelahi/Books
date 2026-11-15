import rateLimit from 'express-rate-limit';
import { ApiError } from '../lib/api-error.js';

export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_request, _response, next) => {
    next(new ApiError(429, 'LOGIN_RATE_LIMITED', 'Too many login attempts. Try again later.'));
  },
});
