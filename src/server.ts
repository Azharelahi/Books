import { app } from './app.js';

const port = Number(process.env.PORT ?? 3000);

const server = app.listen(port, () => {
  console.log(`Bookstore API listening on port ${port}`);
});

server.on('error', (error: NodeJS.ErrnoException) => {
  console.error('Failed to start Bookstore API:', error.message);
  process.exitCode = 1;
});
