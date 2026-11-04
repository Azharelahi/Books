import { app } from './app.js';
import { EnvironmentConfigError, loadConfig } from './config/env.js';
import { createPrismaClient } from './lib/prisma.js';

async function startServer(): Promise<void> {
  let config: ReturnType<typeof loadConfig>;

  try {
    config = loadConfig();
  } catch (error) {
    if (!(error instanceof EnvironmentConfigError)) throw error;

    console.error(`Invalid environment configuration: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const prisma = createPrismaClient(config.DATABASE_URL);

  try {
    await prisma.$connect();
  } catch (error) {
    console.error('Failed to connect to PostgreSQL:', error);
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }

  const server = app.listen(config.PORT, () => {
    console.log(`Bookstore API listening on port ${config.PORT}`);
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    console.error('Failed to start Bookstore API:', error.message);
    void prisma.$disconnect();
    process.exitCode = 1;
  });

  const shutdown = (): void => {
    server.close((error) => {
      if (error) {
        console.error('Failed to close HTTP server:', error);
        process.exitCode = 1;
      }
      void prisma.$disconnect();
    });
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

void startServer();
