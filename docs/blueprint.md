# Bookstore API Blueprint

## Project decisions

- **Runtime:** Node.js with TypeScript and Express.
- **Database:** PostgreSQL accessed through Prisma ORM.
- **Validation:** Zod schemas at HTTP boundaries.
- **Authentication:** JWT bearer tokens; bcrypt password hashing.
- **API prefix:** `/api/v1`.
- **Catalog model:** Books, authors, and categories form a shared catalog. Catalog reads are available to clients; catalog writes are restricted to administrators. Regular users manage only their own reading-list entries.
- **Documentation and manual testing:** OpenAPI documentation and a Postman collection/environment.

## Proposed repository layout

```text
.
├── docs/
│   └── blueprint.md
├── postman/
│   ├── bookstore-api.postman_collection.json
│   └── local.postman_environment.json
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   │   └── env.ts
│   ├── lib/
│   │   ├── api-error.ts
│   │   └── prisma.ts
│   ├── middleware/
│   │   ├── authenticate.ts
│   │   ├── authorize.ts
│   │   ├── error-handler.ts
│   │   ├── not-found.ts
│   │   └── validate.ts
│   └── modules/
│       ├── auth/
│       │   ├── auth.controller.ts
│       │   ├── auth.routes.ts
│       │   ├── auth.schemas.ts
│       │   └── auth.service.ts
│       ├── books/
│       │   ├── books.controller.ts
│       │   ├── books.routes.ts
│       │   ├── books.schemas.ts
│       │   └── books.service.ts
│       ├── authors/
│       │   ├── authors.controller.ts
│       │   ├── authors.routes.ts
│       │   ├── authors.schemas.ts
│       │   └── authors.service.ts
│       ├── categories/
│       │   ├── categories.controller.ts
│       │   ├── categories.routes.ts
│       │   ├── categories.schemas.ts
│       │   └── categories.service.ts
│       └── reading-list/
│           ├── reading-list.controller.ts
│           ├── reading-list.routes.ts
│           ├── reading-list.schemas.ts
│           └── reading-list.service.ts
└── tests/
    ├── integration/
    └── unit/
```

Each feature module owns its HTTP routes, controllers, validation schemas, and business logic. Controllers translate HTTP input/output; services apply domain rules and call Prisma. Shared middleware handles validation, authentication/authorization, 404s, and errors.

## Initial resource and access outline

| Resource | Read access | Write access |
|---|---|---|
| Books | Public catalog | Administrator |
| Authors | Public catalog | Administrator |
| Categories | Public catalog | Administrator |
| Reading list | Authenticated owner only | Authenticated owner only |
| Registration/login | Public | Public |

The user role defaults to `USER`; the admin role must be granted through a controlled seed/administrative process, never from public registration input. Reading-list queries and mutations must always be scoped by the authenticated user's ID.

## Initial route map

All routes are under `/api/v1`.

| Method | Path | Access | Purpose |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Create a user |
| `POST` | `/auth/login` | Public | Authenticate and return a JWT |
| `GET` | `/books` | Public | List/search/paginate catalog books |
| `GET` | `/books/:bookId` | Public | Get a catalog book |
| `POST` | `/books` | Admin | Create a book |
| `PATCH` | `/books/:bookId` | Admin | Update a book |
| `DELETE` | `/books/:bookId` | Admin | Delete a book |
| `GET` | `/authors` | Public | List authors |
| `GET` | `/authors/:authorId` | Public | Get an author |
| `POST` | `/authors` | Admin | Create an author |
| `PATCH` | `/authors/:authorId` | Admin | Update an author |
| `DELETE` | `/authors/:authorId` | Admin | Delete an author |
| `GET` | `/categories` | Public | List categories |
| `GET` | `/categories/:categoryId` | Public | Get a category |
| `POST` | `/categories` | Admin | Create a category |
| `PATCH` | `/categories/:categoryId` | Admin | Update a category |
| `DELETE` | `/categories/:categoryId` | Admin | Delete a category |
| `GET` | `/me/reading-list` | Authenticated | List the caller's entries |
| `POST` | `/me/reading-list` | Authenticated | Add a book to the caller's list |
| `PATCH` | `/me/reading-list/:itemId` | Authenticated | Update status/notes for own entry |
| `DELETE` | `/me/reading-list/:itemId` | Authenticated | Remove own entry |

Reading-list entries reference catalog books and have a unique `(userId, bookId)` pair. A user ID is taken from the verified token, not request payloads.

## Request and error conventions

- Validate route parameters, query strings, and request bodies with Zod before calling services.
- Use consistent JSON responses and appropriate HTTP status codes (`201` for creation, `204` for deletion where no body is returned).
- Return errors in one shape: `{ "error": { "code": "...", "message": "...", "details": [] } }`.
- Map known validation, authentication, authorization, missing-resource, and Prisma constraint errors centrally. Do not return stack traces or secrets to clients.
- Keep secrets in environment variables; validate required configuration during startup.

## Step-by-step implementation and verification plan

Work on one step at a time. After each step, run its listed checks and review the result before starting the next. If a check fails, fix that step before proceeding. No later feature is assumed to exist early.

### Stage 1 — Create and run the smallest app

**Build:** Initialize the Node.js/TypeScript project, add only the initial tooling and Express, and separate app creation from server startup.

**Verify before continuing:**

- Dependencies install successfully.
- TypeScript compilation succeeds.
- The server starts locally and can be stopped cleanly.
- The app responds on a temporary health endpoint.

### Stage 2 — Establish HTTP behavior

**Build:** Add environment configuration, a consistent not-found response, centralized error handling, and Zod-based request validation support. Keep the health endpoint working. `PORT` is optional and defaults to `3000`; database and other integration-specific required settings will be introduced with their later stages.

**Verify before continuing:**

- Invalid configured values (for example, a nonnumeric or out-of-range `PORT`) are reported clearly at startup.
- Unknown paths return the documented JSON error shape.
- A deliberately invalid request to the development-only validation example returns a client error, not a server error.
- The app still compiles and starts.

### Stage 3 — Connect PostgreSQL and Prisma

**Build:** Add Prisma and the PostgreSQL connection configuration; define the initial User, Author, Category, Book, and ReadingListEntry models, relations, and constraints; create and apply the first migration. Copy `.env.example` to `.env` and set a local `DATABASE_URL`. Never commit `.env` or use production credentials for development checks. No account credentials or sample catalog data are seeded; the database verification script creates and removes uniquely named temporary records.

**Verify before continuing:**

- Prisma schema validation succeeds.
- Apply pending migrations with `npm run db:deploy` against the configured local database.
- Run `npm run db:verify` to test Prisma connection, read/write, and constraints.
- Unique and foreign-key constraints behave as designed.
- The API starts only after establishing its database connection and disconnects Prisma on shutdown.

### Stage 4 — Register users

**Build:** Implement registration with Zod input validation, normalized email handling, bcrypt password hashing, and a default non-admin role. Never accept role assignment from public registration.

**Verify before continuing:**

- Valid registration creates a user.
- Invalid input is rejected with useful field details.
- Duplicate email returns a conflict response.
- Stored credentials are password hashes, never plaintext.
- Add automated tests and the matching Postman request.

### Stage 5 — Log in and authenticate requests

**Build:** Implement login, JWT creation, and authentication middleware that validates bearer tokens and exposes the verified user identity to protected routes.

**Verify before continuing:**

- Correct credentials return a usable token.
- Incorrect credentials return a generic authentication error.
- Missing, malformed, expired, and invalid tokens cannot access a protected test route.
- Add automated tests and Postman login/token handling.

### Stage 6 — Add authorization and shared error mapping

**Build:** Add role authorization for catalog administration and map expected Prisma errors (such as unique conflicts and missing records) into the shared API error format.

**Verify before continuing:**

- A regular user cannot use an admin-only test route.
- An administrator can use it.
- Internal stack traces and secrets are not returned to clients.
- Expected database conflicts produce stable client-facing errors.

### Stage 7 — Implement Authors

**Build:** Add public author list/detail endpoints and administrator-only create/update/delete endpoints, with Zod validation and service-layer persistence.

**Verify before continuing:**

- Public reads work; unauthenticated and regular-user writes are denied.
- Administrators can perform the full author CRUD lifecycle.
- Invalid IDs, invalid payloads, and missing records return the expected errors.
- Add endpoint tests and the author requests to Postman.

### Stage 8 — Implement Categories

**Build:** Add public category list/detail endpoints and administrator-only create/update/delete endpoints. Category writes require a unique name and slug; slugs are normalized to lowercase and must contain only letters, numbers, and single hyphens.

**Verify before continuing:**

- Public reads and administrator-only writes behave as documented.
- Category uniqueness and validation constraints are enforced.
- Missing records and database conflicts map to expected errors.
- Add endpoint tests and the category requests to Postman.

### Stage 9 — Implement Books

**Build:** Add public book list/detail endpoints and administrator-only create/update/delete endpoints, including author/category relationships and bounded pagination/search. Book list queries support title search, author/category filters, `page` (default `1`), and `limit` (default `20`, maximum `100`). Book writes accept related IDs and reject nonexistent references.

**Verify before continuing:**

- Administrators can complete the book CRUD lifecycle.
- Public list/detail responses include the intended related data.
- Invalid or nonexistent author/category references are rejected clearly.
- Search and pagination validate their inputs and have enforced limits.
- Add endpoint tests and the book requests to Postman.

### Stage 10 — Implement the private reading list

**Build:** Add authenticated list/add/update/remove operations. Derive the owner exclusively from the verified token and scope every database operation to that owner. A list item contains its book and related authors/categories; the owner ID is never accepted from request data.

**Verify before continuing:**

- A user can manage their own reading-list entries.
- A second user cannot read, update, or delete the first user's entries.
- Clients cannot select another owner by supplying a user ID.
- Duplicate books in one user's list and nonexistent book references are handled consistently.
- Add automated cross-user authorization tests and Postman requests.

### Stage 11 — Complete API documentation and collection

**Build:** Document the implemented routes, schemas, authentication, response/error formats, and example workflows. Complete the Postman collection and local environment without real credentials or secrets.

**Verify before continuing:**

- Every implemented route and access rule appears in the docs.
- The collection can run the documented register → login → protected request workflow.
- Request examples match actual validation and response shapes.

### Stage 12 — Final end-to-end check

**Build:** Address only issues uncovered by the full verification pass; do not add unverified features.

**Verify completion:**

- A clean install, type check, migrations, and automated test suite succeed.
- The app starts against the configured PostgreSQL database.
- The Postman workflow covers auth, catalog access, and owner-isolated reading lists.
- No secrets are committed; documented setup requirements are complete.

## Completion rule

We move forward only after the current stage's verification passes and its behavior is reviewed. Each stage should leave the application runnable; each feature stage should include its automated tests and update the Postman collection before the next feature begins.
