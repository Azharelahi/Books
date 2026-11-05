import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import { app } from '../../app.js';

process.env.NODE_ENV ??= 'development';
process.env.JWT_SECRET ??= 'development-secret-key-change-me-please';

async function withServer(callback: (baseUrl: string, token: string) => Promise<void>): Promise<void> {
  const server = app.listen(0);
  await once(server, 'listening');
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;
  const token = jwt.sign(
    { sub: 'admin-author-test', email: 'admin@example.com', role: 'ADMIN' },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' },
  );

  try {
    await callback(baseUrl, token);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}

test('authors endpoints support public reads and admin CRUD', async () => {
  await withServer(async (baseUrl, token) => {
    const name = `Author ${Date.now()} ${randomUUID().slice(0, 8)}`;

    const createResponse = await fetch(`${baseUrl}/api/v1/authors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name,
        biography: 'A test author created during stage 7 verification.',
      }),
    });

    assert.equal(createResponse.status, 201, 'create author should succeed for admin');
    const created = await createResponse.json();
    assert.equal(created.author.name, name);
    assert.equal(typeof created.author.id, 'string');

    const authorId = created.author.id;

    const listResponse = await fetch(`${baseUrl}/api/v1/authors`);
    assert.equal(listResponse.status, 200, 'list authors should be public');
    const list = await listResponse.json();
    assert.ok(Array.isArray(list.authors));
    assert.ok(list.authors.some((author: { id: string }) => author.id === authorId));

    const detailResponse = await fetch(`${baseUrl}/api/v1/authors/${authorId}`);
    assert.equal(detailResponse.status, 200, 'author detail should be public');
    const detail = await detailResponse.json();
    assert.equal(detail.author.id, authorId);

    const patchResponse = await fetch(`${baseUrl}/api/v1/authors/${authorId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ biography: 'Updated biography' }),
    });

    assert.equal(patchResponse.status, 200, 'admin patch should succeed');
    const patched = await patchResponse.json();
    assert.equal(patched.author.biography, 'Updated biography');

    const deleteResponse = await fetch(`${baseUrl}/api/v1/authors/${authorId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    assert.equal(deleteResponse.status, 204, 'admin delete should succeed');
  });
});

test('author detail route rejects invalid UUIDs', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/authors/not-a-uuid`);
    assert.equal(response.status, 400, 'invalid author id should be rejected');
    const payload = await response.json();
    assert.equal(payload.error.code, 'VALIDATION_ERROR');
  });
});
