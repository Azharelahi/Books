import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z
    .string()
    .url()
    .refine((value) => value.startsWith('postgresql://') || value.startsWith('postgres://'), {
      message: 'must be a PostgreSQL connection URL',
    }),
  JWT_SECRET: z.string().min(32).default('i will use the key later, let me build the rest of tha app pahlay'),
  JWT_EXPIRES_IN: z.string().default('1h'),
});

export type AppConfig = z.infer<typeof envSchema>;

export class EnvironmentConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvironmentConfigError';
  }
}

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new EnvironmentConfigError(issues);
  }

  return result.data;
}
