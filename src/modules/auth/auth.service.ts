import { compare, hash } from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { UserRole } from '../../generated/prisma/enums.js';
import { config } from '../../config/env.js';
import { ApiError } from '../../lib/api-error.js';
import { prisma } from '../../lib/prisma.js';

export type RegisterUserInput = {
  email: string;
  password: string;
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: UserRole;
};

// Compute once during startup so missing-account logins still pay bcrypt's comparison cost.
const dummyPasswordHash = hash('not-a-real-user-password', 12);

export async function registerUser({ email, password }: RegisterUserInput) {
  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await hash(password, 12);
  const user = await prisma.user.create({
    data: { email: normalizedEmail, passwordHash },
  });

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function loginUser({ email, password }: RegisterUserInput): Promise<{ token: string; user: AuthenticatedUser }> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  const passwordHash = user?.passwordHash ?? await dummyPasswordHash;
  const passwordMatches = await compare(password, passwordHash);

  if (!user || !passwordMatches) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const signOptions: SignOptions = {
    expiresIn: config.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };
  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    config.JWT_SECRET,
    signOptions,
  );

  return { token, user: { id: user.id, email: user.email, role: user.role } };
}
