# Bookstore

A full stack bookstore catalog and reading list application. The project has a TypeScript/Express API backed by PostgreSQL and Prisma, plus a React/Vite storefront.

## Features

- Browse, search, and filter books, authors, and categories.
- Register and sign in with JWT authentication.
- Maintain a personal reading list with `TO_READ`, `READING`, and `COMPLETED` statuses and optional notes.
- Manage catalog books, authors, and categories with an administrator account.
- Validate API requests and return consistent JSON errors.

## Stack

- Node.js, TypeScript, Express 5
- PostgreSQL and Prisma
- React 19, React Router, and Vite
- Zod request validation; JWT authentication and bcrypt password hashing

## Requirements

- Node.js compatible with the installed TypeScript, Vite, and Prisma versions
- npm
- PostgreSQL

## Getting started

### 1. Configure the API

From the repository root, create `.env` with the following values, replacing the database URL and secret for your local environment:

```dotenv
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bookstore
JWT_SECRET=replace-with-a-private-secret-at-least-32-characters-long
JWT_EXPIRES_IN=1h
```

`DATABASE_URL` must point to a PostgreSQL database. `JWT_SECRET` must contain at least 32 characters. Keep `.env` private; it is ignored by Git.

Install dependencies, generate the Prisma client, and apply migrations:

```bash
npm install
npm run db:generate
npm run db:migrate
```

Start the API:

```bash
npm run dev
```

The API listens on `http://localhost:3000` by default. Check `http://localhost:3000/health` for database connectivity.

### 2. Start the storefront

In another terminal, from the repository root:

```bash
npm install --prefix frontend
npm run dev --prefix frontend
```

Open the local URL printed by Vite. During development, Vite proxies `/api/v1` requests to the API at `http://localhost:3000`.

To point the frontend at a different API base path, create `frontend/.env.local` based on `frontend/.env.example` and set `VITE_API_BASE_URL`. The API does not enable cross-origin requests; for production, serve the frontend and API behind a same-origin reverse proxy for `/api/v1`.

## Administrator and demo catalog

Public registration always creates a regular `USER`. To create or update an administrator, set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the environment and run the Prisma seed command:

```bash
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=change-me-now npm run db:seed
```

`ADMIN_PASSWORD` must have at least 8 characters. On PowerShell, set the variables first:

```powershell
$env:ADMIN_EMAIL = "admin@example.com"
$env:ADMIN_PASSWORD = "change-me-now"
npm run db:seed
```

The demo catalog seed adds sample books, authors, and categories without replacing existing books:

```bash
npm run db:seed:catalog
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Run the API in watch mode |
| `npm run build` | Generate Prisma client and compile the API to `dist/` |
| `npm start` | Run the compiled API |
| `npm run typecheck` | Type-check application and scripts |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:migrate` | Create/apply a development migration |
| `npm run db:deploy` | Apply committed migrations |
| `npm run db:verify` | Check database connectivity and schema |
| `npm run db:seed` | Seed or update the administrator account (requires `ADMIN_EMAIL` and `ADMIN_PASSWORD`) |
| `npm run db:seed:catalog` | Add demo catalog data |
| `npm run build --prefix frontend` | Type-check and build the storefront to `frontend/dist/` |
| `npm run dev --prefix frontend` | Run the storefront in Vite |

## Tests

Tests use a separate database. Create `.env.test` from `.env.test.example`, then ensure PostgreSQL is running and the database name in `DATABASE_URL` includes `test` (the scripts refuse to run migrations or tests against a database without `test` in its name).

```bash
npm run db:test:setup
npm test
```

The test setup deploys migrations to the configured test database. Do not point `.env.test` at a database with data you need to keep.

## API and project documentation

- [API contract](docs/api-contract.md) — endpoints, authentication, request/response formats, and errors.
- [Project blueprint](docs/blueprint.md) — architecture and project decisions.
- [Postman collections](postman/) — API request collections for manual use.
- [Storefront guide](frontend/README.md) — frontend routes and behavior.

The API prefix is `/api/v1`. Public catalog reads are available without a token; catalog writes require an administrator bearer token. Reading-list endpoints require authentication and are scoped to the signed-in user.
