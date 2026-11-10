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

test('books support public search/detail and admin CRUD with related data', async () => {
  await withServer(async (baseUrl, adminToken, userToken) => {
    const unique = randomUUID();
    const authorization = { Authorization: `Bearer ${adminToken}` };
    let authorId: string | undefined;
    let categoryId: string | undefined;
    let bookId: string | undefined;

    try {
      const authorResponse = await fetch(`${baseUrl}/api/v1/authors`, {
        method: 'POST',
        headers: { ...authorization, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `Book test author ${unique}` }),
      });
      assert.equal(authorResponse.status, 201);
      authorId = (await authorResponse.json()).author.id;

      const categoryResponse = await fetch(`${baseUrl}/api/v1/categories`, {
        method: 'POST',
        headers: { ...authorization, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `Book test category ${unique}`, slug: `book-test-${unique}` }),
      });
      assert.equal(categoryResponse.status, 201);
      categoryId = (await categoryResponse.json()).category.id;

      const title = `Book test title ${unique}`;
      const isbn = `978${Date.now().toString().slice(-10)}`;
      const createResponse = await fetch(`${baseUrl}/api/v1/books`, {
        method: 'POST',
        headers: { ...authorization, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          isbn,
          description: 'Created by the books integration test.',
          publishedAt: '2024-02-29',
          authorIds: [authorId],
          categoryIds: [categoryId],
        }),
      });
      assert.equal(createResponse.status, 201);
      const created = await createResponse.json();
      bookId = created.book.id;
      assert.equal(created.book.title, title);
      assert.equal(created.book.authors[0].id, authorId);
      assert.equal(created.book.categories[0].id, categoryId);
      assert.equal(new Date(created.book.publishedAt).toISOString().slice(0, 10), '2024-02-29');

      const detailResponse = await fetch(`${baseUrl}/api/v1/books/${bookId}`);
      assert.equal(detailResponse.status, 200);
      const detail = await detailResponse.json();
      assert.equal(detail.book.id, bookId);
      assert.equal(detail.book.authors[0].id, authorId);
      assert.equal(detail.book.categories[0].id, categoryId);

      const searchResponse = await fetch(
        `${baseUrl}/api/v1/books?search=${encodeURIComponent(title.slice(0, 15))}&authorId=${authorId}&categoryId=${categoryId}&page=1&limit=1`,
      );
      assert.equal(searchResponse.status, 200);
      const search = await searchResponse.json();
      assert.equal(search.books.length, 1);
      assert.equal(search.pagination.total, 1);
      assert.equal(search.pagination.totalPages, 1);

      const unauthorizedResponse = await fetch(`${baseUrl}/api/v1/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ title: 'Denied book' }),
      });
      assert.equal(unauthorizedResponse.status, 403);

      const updateResponse = await fetch(`${baseUrl}/api/v1/books/${bookId}`, {
        method: 'PATCH',
        headers: { ...authorization, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `${title} updated`, categoryIds: [] }),
      });
      assert.equal(updateResponse.status, 200);
      const updated = await updateResponse.json();
      assert.equal(updated.book.categories.length, 0);
      assert.equal(updated.book.authors[0].id, authorId);

      const deleteResponse = await fetch(`${baseUrl}/api/v1/books/${bookId}`, {
        method: 'DELETE',
        headers: authorization,
      });
      assert.equal(deleteResponse.status, 204);
      bookId = undefined;

      const missingResponse = await fetch(`${baseUrl}/api/v1/books/${randomUUID()}`);
      assert.equal(missingResponse.status, 404);
      assert.equal((await missingResponse.json()).error.code, 'BOOK_NOT_FOUND');
    } finally {
      if (bookId) {
        await fetch(`${baseUrl}/api/v1/books/${bookId}`, { method: 'DELETE', headers: authorization });
      }
      if (authorId) {
        await fetch(`${baseUrl}/api/v1/authors/${authorId}`, { method: 'DELETE', headers: authorization });
      }
      if (categoryId) {
        await fetch(`${baseUrl}/api/v1/categories/${categoryId}`, { method: 'DELETE', headers: authorization });
      }
    }
  });
});

test('book inputs reject invalid paging and nonexistent related IDs', async () => {
  await withServer(async (baseUrl, adminToken) => {
    const oversizedPage = await fetch(`${baseUrl}/api/v1/books?limit=101`);
    assert.equal(oversizedPage.status, 400);

    const invalidSearch = await fetch(`${baseUrl}/api/v1/books?page=1.5`);
    assert.equal(invalidSearch.status, 400);

    const missingAuthorId = randomUUID();
    const invalidReference = await fetch(`${baseUrl}/api/v1/books`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'Invalid relation', authorIds: [missingAuthorId] }),
    });
    assert.equal(invalidReference.status, 400);
    const payload = await invalidReference.json();
    assert.equal(payload.error.code, 'INVALID_BOOK_RELATION');
    assert.equal(payload.error.details[0].path, 'body.authorIds');
  });
});
