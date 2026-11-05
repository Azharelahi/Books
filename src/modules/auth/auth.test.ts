import assert from 'node:assert/strict';
import test from 'node:test';
import { authenticate } from '../../middleware/authenticate.js';
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
