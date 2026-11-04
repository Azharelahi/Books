import { randomUUID } from 'node:crypto';
import { Prisma } from '../src/generated/prisma/client.js';
import { createPrismaClient } from '../src/lib/prisma.js';
import { loadConfig } from '../src/config/env.js';

const userId = randomUUID();
const bookId = randomUUID();
const email = `stage3-${randomUUID()}@example.test`;

async function verifyDatabase(): Promise<void> {
  const config = loadConfig();
  const prisma = createPrismaClient(config.DATABASE_URL);
  let connected = false;
  try {
    await prisma.$connect();
    connected = true;

    const user = await prisma.user.create({
      data: { id: userId, email, passwordHash: 'verification-only' },
    });
    const book = await prisma.book.create({
      data: { id: bookId, title: 'Stage 3 persistence verification' },
    });

    const entry = await prisma.readingListEntry.create({
      data: { userId: user.id, bookId: book.id },
    });

    const persistedEntry = await prisma.readingListEntry.findUnique({
      where: { userId_bookId: { userId: user.id, bookId: book.id } },
    });
    if (!persistedEntry || persistedEntry.id !== entry.id) {
      throw new Error('Could not read back the persisted reading-list entry');
    }

    await expectConstraintError(
      () => prisma.readingListEntry.create({ data: { userId: user.id, bookId: book.id } }),
      'P2002',
      'Duplicate user/book pairs must be rejected',
    );

    await expectConstraintError(
      () => prisma.readingListEntry.create({ data: { userId: randomUUID(), bookId: book.id } }),
      'P2003',
      'Unknown user foreign keys must be rejected',
    );

    console.log('Database read/write and unique/foreign-key checks passed.');
  } finally {
    try {
      if (connected) {
        await prisma.readingListEntry.deleteMany({ where: { userId } });
        await prisma.user.deleteMany({ where: { id: userId } });
        await prisma.book.deleteMany({ where: { id: bookId } });
      }
    } finally {
      await prisma.$disconnect();
    }
  }
}

async function expectConstraintError(
  operation: () => Promise<unknown>,
  expectedCode: string,
  failureMessage: string,
): Promise<void> {
  try {
    await operation();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === expectedCode) {
      return;
    }
    throw error;
  }

  throw new Error(failureMessage);
}

void verifyDatabase().catch((error: unknown) => {
  console.error('Database verification failed:', error);
  process.exitCode = 1;
});
