import 'dotenv/config';
import express from 'express';
import { z } from 'zod';
import { UserRole } from './generated/prisma/enums.js';
import authRoutes from './modules/auth/auth.routes.js';
import authorsRoutes from './modules/authors/authors.routes.js';
import { authenticate } from './middleware/authenticate.js';
import { authorize } from './middleware/authorize.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFound } from './middleware/not-found.js';
import { validate } from './middleware/validate.js';

export const app = express();

app.use(express.json());

app.get('/health', (_request, response) => {
  response.status(200).json({ status: 'ok' });
});
app.get('/', (_request, response) => {
  response.status(200).json({ message: 'Welcome to Bookstore API' });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/authors', authorsRoutes);

if (process.env.NODE_ENV !== 'production') {
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
