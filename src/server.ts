import { app } from './app.js';
import { config } from './config/env.js';
import { prisma } from './lib/prisma.js';

async function startServer(): Promise<void> {
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
