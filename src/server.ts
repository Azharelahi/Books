import { app } from './app.js';
import { EnvironmentConfigError, loadConfig } from './config/env.js';

let config: ReturnType<typeof loadConfig> | undefined;
try {
  config = loadConfig();
} catch (error) {
  if (!(error instanceof EnvironmentConfigError)) throw error;

  console.error(`Invalid environment configuration: ${error.message}`);
  process.exitCode = 1;
}

if (config) {
  const server = app.listen(config.PORT, () => {
    console.log(`Bookstore API listening on port ${config.PORT}`);
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    console.error('Failed to start Bookstore API:', error.message);
    process.exitCode = 1;
  });
}
