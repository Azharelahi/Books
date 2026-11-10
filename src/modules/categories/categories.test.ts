import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import { app } from '../../app.js';

process.env.NODE_ENV ??= 'development';
process.env.JWT_SECRET ??= 'development-secret-key-change-me-please';

async function withServer(
  callback: (baseUrl: string, adminToken: string, userToken: string) => Promise<void>,
): Promise<void> {
  const server = app.listen(0);
  await once(server, 'listening');
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;
  const adminToken = jwt.sign(
    { sub: randomUUID(), email: 'admin@example.com', role: 'ADMIN' },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' },
  );
  const userToken = jwt.sign(
    { sub: randomUUID(), email: 'user@example.com', role: 'USER' },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' },
  );

  try {
    await callback(baseUrl, adminToken, userToken);
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

test('categories expose public reads and restrict CRUD to administrators', async () => {
  await withServer(async (baseUrl, adminToken, userToken) => {
    const unique = randomUUID();
    const name = `Category ${unique}`;
    const slug = `category-${unique}`;

    const publicList = await fetch(`${baseUrl}/api/v1/categories`);
    assert.equal(publicList.status, 200);
    assert.ok(Array.isArray((await publicList.json()).categories));

    const unauthenticatedCreate = await fetch(`${baseUrl}/api/v1/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug }),
    });
    assert.equal(unauthenticatedCreate.status, 401);

    const regularUserCreate = await fetch(`${baseUrl}/api/v1/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ name, slug }),
    });
    assert.equal(regularUserCreate.status, 403);

    const createResponse = await fetch(`${baseUrl}/api/v1/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ name, slug: slug.toUpperCase() }),
    });
    assert.equal(createResponse.status, 201);
    const created = await createResponse.json();
    assert.equal(created.category.name, name);
    assert.equal(created.category.slug, slug);

    const categoryId = created.category.id as string;
    try {
      const detailResponse = await fetch(`${baseUrl}/api/v1/categories/${categoryId}`);
      assert.equal(detailResponse.status, 200);
      assert.equal((await detailResponse.json()).category.id, categoryId);

      const duplicateResponse = await fetch(`${baseUrl}/api/v1/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ name: `Another ${unique}`, slug }),
      });
      assert.equal(duplicateResponse.status, 409);
      assert.equal((await duplicateResponse.json()).error.code, 'CATEGORY_ALREADY_EXISTS');

      const updatedName = `Updated ${name}`;
      const updateResponse = await fetch(`${baseUrl}/api/v1/categories/${categoryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ name: updatedName, slug: `updated-${slug}` }),
      });
      assert.equal(updateResponse.status, 200);
      assert.equal((await updateResponse.json()).category.name, updatedName);

      const invalidUpdate = await fetch(`${baseUrl}/api/v1/categories/${categoryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ slug: 'Invalid Slug' }),
      });
      assert.equal(invalidUpdate.status, 400);

      const deleteResponse = await fetch(`${baseUrl}/api/v1/categories/${categoryId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(deleteResponse.status, 204);
    } finally {
      const cleanup = await fetch(`${baseUrl}/api/v1/categories/${categoryId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.ok(cleanup.status === 204 || cleanup.status === 404);
    }

    const missingResponse = await fetch(`${baseUrl}/api/v1/categories/${randomUUID()}`);
    assert.equal(missingResponse.status, 404);
    assert.equal((await missingResponse.json()).error.code, 'CATEGORY_NOT_FOUND');
  });
});

test('category routes reject malformed IDs and unknown input fields', async () => {
  await withServer(async (baseUrl, adminToken) => {
    const invalidIdResponse = await fetch(`${baseUrl}/api/v1/categories/not-a-uuid`);
    assert.equal(invalidIdResponse.status, 400);

    const invalidBodyResponse = await fetch(`${baseUrl}/api/v1/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ name: 'Fiction', slug: 'fiction', role: 'ADMIN' }),
    });
    assert.equal(invalidBodyResponse.status, 400);
  });
});
