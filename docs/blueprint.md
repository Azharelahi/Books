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
| `GET` | `/me/reading-list` | Owner | List the caller's entries |
| `POST` | `/me/reading-list` | Owner | Add a book to the caller's list |
| `PATCH` | `/me/reading-list/:itemId` | Owner | Update status/notes for own entry |
| `DELETE` | `/me/reading-list/:itemId` | Owner | Remove own entry |

Reading-list entries reference catalog books and have a unique `(userId, bookId)` pair. A user ID is taken from the verified token, not request payloads.

## Request and error conventions

- Validate route parameters, query strings, and request bodies with Zod before calling services.
- Use consistent JSON responses and appropriate HTTP status codes (`201` for creation, `204` for deletion where no body is returned).
- Return errors in one shape: `{ "error": { "code": "...", "message": "...", "details": [] } }`.
- Map known validation, authentication, authorization, missing-resource, and Prisma constraint errors centrally. Do not return stack traces or secrets to clients.
- Keep secrets in environment variables; validate required configuration during startup.

## Suggested vertical implementation sequence

1. **Foundation:** package/tooling setup, environment validation, Express app/server split, health endpoint, centralized errors.
2. **Persistence:** Prisma/PostgreSQL connection, initial schema, migrations, safe seed strategy.
3. **Auth vertical:** register/login, bcrypt, JWT middleware, tests, and Postman requests.
4. **Catalog vertical:** authors/categories/books CRUD, Zod validation, admin authorization, pagination, tests.
5. **Reading-list vertical:** owner-scoped CRUD, cross-user access tests, Postman requests.
6. **Documentation and hardening:** OpenAPI docs, completed Postman collection/environment, input/error review, full test run.

At each vertical, implement and verify one end-to-end slice (schema → route → validation → service → persistence → tests → collection) before moving on.
