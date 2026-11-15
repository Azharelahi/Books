import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const envPath = path.resolve('.env.test');
const loaded = dotenv.config({ path: envPath, override: true });
if (loaded.error) {
  console.error('Create .env.test from .env.test.example before running tests.');
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('.env.test must define DATABASE_URL.');
  process.exit(1);
}

const databaseName = decodeURIComponent(new URL(databaseUrl).pathname).replace(/^\//, '').toLowerCase();
if (!databaseName.includes('test')) {
  console.error('Refusing to run tests: the database name in .env.test must include "test".');
  process.exit(1);
}
process.env.NODE_ENV = 'test';

function findTests(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory()
      ? findTests(fullPath)
      : entry.isFile() && entry.name.endsWith('.test.ts') ? [fullPath] : [];
  });
}

const files = findTests('tests');
if (!files.length) {
  console.error('No test files found under tests/.');
  process.exit(1);
}

const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', '--test-concurrency=1', ...files], {
  stdio: 'inherit',
  env: process.env,
});
process.exit(result.status ?? 1);
