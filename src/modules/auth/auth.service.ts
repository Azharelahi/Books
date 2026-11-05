import { compare, hash } from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { Prisma } from '../../generated/prisma/client.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { loadConfig } from '../../config/env.js';
import { ApiError } from '../../lib/api-error.js';
import { createPrismaClient } from '../../lib/prisma.js';

export type RegisterUserInput = {
  email: string;
  password: string;
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: UserRole;
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

export async function loginUser({ email, password }: RegisterUserInput): Promise<{ token: string; user: AuthenticatedUser }> {
  const normalizedEmail = email.trim().toLowerCase();
  const prisma = createPrismaClient(loadConfig().DATABASE_URL);

  try {
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const isPasswordValid = await compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const config = loadConfig();
    const signOptions: SignOptions = {
      expiresIn: config.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    };

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      config.JWT_SECRET,
      signOptions,
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  } finally {
    await prisma.$disconnect();
  }
}
