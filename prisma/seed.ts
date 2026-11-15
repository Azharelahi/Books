import 'dotenv/config';
import { hash } from 'bcryptjs';
import { UserRole } from '../src/generated/prisma/enums.js';
import { prisma } from '../src/lib/prisma.js';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!email || !password || password.length < 8) {
  throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 8 characters) before seeding an admin.');
}

try {
  const passwordHash = await hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: UserRole.ADMIN },
    create: { email, passwordHash, role: UserRole.ADMIN },
  });
  console.log(`Admin account ensured for ${email}`);
} finally {
  await prisma.$disconnect();
}
