import { spawnSync } from 'node:child_process';
import path from 'node:path';
import dotenv from 'dotenv';

const loaded = dotenv.config({ path: path.resolve('.env.test'), override: true });
if (loaded.error || !process.env.DATABASE_URL) {
  console.error('Create .env.test from .env.test.example before preparing the test database.');
  process.exit(1);
}
const databaseName = decodeURIComponent(new URL(process.env.DATABASE_URL).pathname).replace(/^\//, '').toLowerCase();
if (!databaseName.includes('test')) {
  console.error('Refusing to migrate: the database name in .env.test must include "test".');
  process.exit(1);
}

process.env.NODE_ENV = 'test';
const prismaCli = path.resolve('node_modules/prisma/build/index.js');
const result = spawnSync(process.execPath, [prismaCli, 'migrate', 'deploy'], { stdio: 'inherit', env: process.env });
process.exit(result.status ?? 1);
