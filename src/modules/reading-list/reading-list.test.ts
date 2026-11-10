import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import { app } from '../../app.js';
import { loadConfig } from '../../config/env.js';
import { createPrismaClient } from '../../lib/prisma.js';

process.env.NODE_ENV ??= 'development';
process.env.JWT_SECRET ??= 'development-secret-key-change-me-please';

test('reading-list entries are scoped to the authenticated owner', async () => {
  const prisma = createPrismaClient(loadConfig().DATABASE_URL);
  const ownerId = randomUUID();
  const otherUserId = randomUUID();
  const bookId = randomUUID();
  const emailSuffix = randomUUID();
  const server = app.listen(0);

  try {
    await once(server, 'listening');
    const { port } = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${port}`;
    const ownerEmail = `reading-list-owner-${emailSuffix}@example.test`;
    const otherEmail = `reading-list-other-${emailSuffix}@example.test`;

    await prisma.user.createMany({
      data: [
        { id: ownerId, email: ownerEmail, passwordHash: 'test-only-hash' },
        { id: otherUserId, email: otherEmail, passwordHash: 'test-only-hash' },
      ],
    });
    await prisma.book.create({ data: { id: bookId, title: `Reading-list test ${emailSuffix}` } });

    const ownerToken = jwt.sign(
      { sub: ownerId, email: ownerEmail, role: 'USER' },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' },
    );
    const otherToken = jwt.sign(
      { sub: otherUserId, email: otherEmail, role: 'USER' },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' },
    );
    const ownerHeaders = { Authorization: `Bearer ${ownerToken}` };
    const otherHeaders = { Authorization: `Bearer ${otherToken}` };

    const addResponse = await fetch(`${baseUrl}/api/v1/me/reading-list`, {
      method: 'POST',
      headers: { ...ownerHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId }),
    });
    assert.equal(addResponse.status, 201);
    const created = await addResponse.json();
    const itemId = created.entry.id as string;
    assert.equal(created.entry.userId, ownerId);

    const ownerListResponse = await fetch(`${baseUrl}/api/v1/me/reading-list`, {
      headers: ownerHeaders,
    });
    assert.equal(ownerListResponse.status, 200);
    const ownerList = await ownerListResponse.json();
    assert.equal(ownerList.entries.length, 1);
    assert.equal(ownerList.entries[0].book.id, bookId);

    const otherListResponse = await fetch(`${baseUrl}/api/v1/me/reading-list`, {
      headers: otherHeaders,
    });
    assert.equal(otherListResponse.status, 200);
    assert.equal((await otherListResponse.json()).entries.length, 0);

    const otherPatchResponse = await fetch(`${baseUrl}/api/v1/me/reading-list/${itemId}`, {
      method: 'PATCH',
      headers: { ...otherHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
    assert.equal(otherPatchResponse.status, 404);

    const otherDeleteResponse = await fetch(`${baseUrl}/api/v1/me/reading-list/${itemId}`, {
      method: 'DELETE',
      headers: otherHeaders,
    });
    assert.equal(otherDeleteResponse.status, 404);

    const ownerPatchResponse = await fetch(`${baseUrl}/api/v1/me/reading-list/${itemId}`, {
      method: 'PATCH',
      headers: { ...ownerHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'READING', notes: 'Started reading' }),
    });
    assert.equal(ownerPatchResponse.status, 200);
    const updated = await ownerPatchResponse.json();
    assert.equal(updated.entry.status, 'READING');
    assert.equal(updated.entry.notes, 'Started reading');

    const duplicateResponse = await fetch(`${baseUrl}/api/v1/me/reading-list`, {
      method: 'POST',
      headers: { ...ownerHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId }),
    });
    assert.equal(duplicateResponse.status, 409);

    const ownerSpoofResponse = await fetch(`${baseUrl}/api/v1/me/reading-list`, {
      method: 'POST',
      headers: { ...ownerHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId, userId: otherUserId }),
    });
    assert.equal(ownerSpoofResponse.status, 400);

    const missingBookResponse = await fetch(`${baseUrl}/api/v1/me/reading-list`, {
      method: 'POST',
      headers: { ...ownerHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId: randomUUID() }),
    });
    assert.equal(missingBookResponse.status, 404);
    assert.equal((await missingBookResponse.json()).error.code, 'BOOK_NOT_FOUND');

    const ownerDeleteResponse = await fetch(`${baseUrl}/api/v1/me/reading-list/${itemId}`, {
      method: 'DELETE',
      headers: ownerHeaders,
    });
    assert.equal(ownerDeleteResponse.status, 204);
  } finally {
    await prisma.readingListEntry.deleteMany({ where: { userId: { in: [ownerId, otherUserId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, otherUserId] } } });
    await prisma.book.deleteMany({ where: { id: bookId } });
    await prisma.$disconnect();
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
});

test('reading-list routes require authentication and validate payloads', async () => {
  const server = app.listen(0);
  try {
    await once(server, 'listening');
    const { port } = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${port}`;

    const unauthenticated = await fetch(`${baseUrl}/api/v1/me/reading-list`);
    assert.equal(unauthenticated.status, 401);

    const token = jwt.sign(
      { sub: randomUUID(), email: 'validation@example.test', role: 'USER' },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' },
    );
    const invalidStatus = await fetch(`${baseUrl}/api/v1/me/reading-list/${randomUUID()}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'INVALID' }),
    });
    assert.equal(invalidStatus.status, 400);
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
});
