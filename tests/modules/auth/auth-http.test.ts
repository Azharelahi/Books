import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { app } from '../../../src/app.js';
import { prisma } from '../../../src/lib/prisma.js';

test('register and login work over HTTP; invalid credentials return 401', async () => {
  const email = `auth-http-${randomUUID()}@example.test`;
  const password = 'correct-horse-battery-staple';
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}/api/v1/auth`;

  try {
    const registerResponse = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(registerResponse.status, 201);
    const registered = await registerResponse.json();
    assert.equal(registered.user.email, email);
    assert.equal(registered.user.role, 'USER');

    const loginResponse = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(loginResponse.status, 200);
    assert.equal(typeof (await loginResponse.json()).token, 'string');

    const shortWrongPassword = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'x' }),
    });
    assert.equal(shortWrongPassword.status, 401);

    const missingEmail = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `missing-${randomUUID()}@example.test`, password }),
    });
    assert.equal(missingEmail.status, 401);

    for (let attempt = 0; attempt < 9; attempt += 1) {
      const limitedAttempt = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'x' }),
      });
      assert.equal(limitedAttempt.status, attempt === 8 ? 429 : 401);
    }
  } finally {
    await prisma.user.deleteMany({ where: { email } });
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
