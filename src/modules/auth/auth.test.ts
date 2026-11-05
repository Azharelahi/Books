import assert from 'node:assert/strict';
import test from 'node:test';
import { Prisma } from '../../generated/prisma/client.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { errorHandler } from '../../middleware/error-handler.js';
import { loginSchema } from './auth.schemas.js';

test('login schema accepts valid credentials', () => {
  const result = loginSchema.safeParse({
    email: 'alice@example.com',
    password: 'Password123',
  });

  assert.equal(result.success, true);
});

test('login schema rejects invalid email', () => {
  const result = loginSchema.safeParse({
    email: 'not-an-email',
    password: 'Password123',
  });

  assert.equal(result.success, false);
  if (result.success) {
    throw new Error('Expected validation to fail');
  }
  assert.match(JSON.stringify(result.error.issues), /Email must be a valid email address/);
});

test('authenticate rejects requests without bearer token', () => {
  let error: unknown;

  authenticate(
    { headers: {} } as any,
    {} as any,
    (nextError) => {
      error = nextError;
    },
  );

  assert.ok(error);
  assert.equal((error as any).statusCode, 401);
  assert.equal((error as any).code, 'UNAUTHORIZED');
});

test('authorize allows admin users only', () => {
  let nextCalled = false;

  authorize(UserRole.ADMIN)({
    user: { id: '1', email: 'admin@example.com', role: UserRole.ADMIN },
  } as any, {} as any, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);

  let forbidden: unknown;
  authorize(UserRole.ADMIN)({
    user: { id: '2', email: 'user@example.com', role: UserRole.USER },
  } as any, {} as any, (error) => {
    forbidden = error;
  });

  assert.ok(forbidden);
  assert.equal((forbidden as any).statusCode, 403);
  assert.equal((forbidden as any).code, 'FORBIDDEN');
});

test('error handler maps Prisma unique and missing-record errors', () => {
  const response: any = {
    statusCode: 0,
    payload: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.payload = payload;
      return this;
    },
  };

  const uniqueError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target: ['email'] },
  });

  errorHandler(uniqueError, {} as any, response, () => undefined);
  assert.equal(response.statusCode, 409);
  assert.equal(response.payload.error.code, 'RESOURCE_CONFLICT');

  const missingError = new Prisma.PrismaClientKnownRequestError('Record not found', {
    code: 'P2025',
    clientVersion: 'test',
  });

  const missingResponse: any = {
    statusCode: 0,
    payload: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.payload = payload;
      return this;
    },
  };

  errorHandler(missingError, {} as any, missingResponse, () => undefined);
  assert.equal(missingResponse.statusCode, 404);
  assert.equal(missingResponse.payload.error.code, 'RESOURCE_NOT_FOUND');
});
