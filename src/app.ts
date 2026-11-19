import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import { z } from 'zod';
import { UserRole } from './generated/prisma/enums.js';
import authRoutes from './modules/auth/auth.routes.js';
import authorsRoutes from './modules/authors/authors.routes.js';
import booksRoutes from './modules/books/books.routes.js';
import categoriesRoutes from './modules/categories/categories.routes.js';
import readingListRoutes from './modules/reading-list/reading-list.routes.js';
import { authenticate } from './middleware/authenticate.js';
import { authorize } from './middleware/authorize.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFound } from './middleware/not-found.js';
import { validate } from './middleware/validate.js';
import { config } from './config/env.js';
import { prisma } from './lib/prisma.js';

export const app = express();
app.set('trust proxy', 'loopback');
app.use(helmet());
app.use((request, response, next) => {
  const startedAt = performance.now();
  response.on('finish', () => {
    console.log(JSON.stringify({
      level: 'info',
      method: request.method,
      path: request.path,
      status: response.statusCode,
      durationMs: Math.round(performance.now() - startedAt),
    }));
  });
  next();
});
app.use(express.json());

app.get('/health', async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    response.status(200).json({ status: 'ok' });
  } catch {
    response.status(503).json({ status: 'unavailable' });
  }
});
app.get('/', (_request, response) => {
  response.status(200).json({ message: 'Welcome to Bookstore API' });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/authors', authorsRoutes);
app.use('/api/v1/books', booksRoutes);
app.use('/api/v1/categories', categoriesRoutes);
app.use('/api/v1/me/reading-list', readingListRoutes);

if (config.NODE_ENV === 'development') {
  app.get('/_dev/protected', authenticate, (request, response) => {
    response.status(200).json({ user: request.user });
  });

  app.get('/_dev/admin', authenticate, authorize(UserRole.ADMIN), (request, response) => {
    response.status(200).json({ ok: true, user: request.user });
  });

  app.post(
    '/_dev/validation',
    validate({ body: z.object({ value: z.string().min(3) }) }),
    (_request, response) => {
      response.status(200).json(response.locals.validatedRequest);
    },
  );
}

app.use(notFound);
app.use(errorHandler);
