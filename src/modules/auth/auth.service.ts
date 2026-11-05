import { hash } from 'bcryptjs';
import { Prisma } from '../../generated/prisma/client.js';
import { loadConfig } from '../../config/env.js';
import { ApiError } from '../../lib/api-error.js';
import { createPrismaClient } from '../../lib/prisma.js';

export type RegisterUserInput = {
  email: string;
  password: string;
};

export async function registerUser({ email, password }: RegisterUserInput) {
  const normalizedEmail = email.trim().toLowerCase();
  const prisma = createPrismaClient(loadConfig().DATABASE_URL);

  try {
    const passwordHash = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
      },
    });

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ApiError(409, 'EMAIL_ALREADY_EXISTS', 'A user with this email already exists', [
        { path: 'email', message: 'Email is already in use' },
      ]);
    }

    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
