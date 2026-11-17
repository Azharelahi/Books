# Bookstore API Contract

This contract describes the implemented Express API and can be used to verify requests in Postman.

## Postman setup

Set `baseUrl` to the API origin, for example `http://localhost:3000`. Use `{{baseUrl}}` at the start of each URL below. API routes use `/api/v1`.

For JSON requests, set `Content-Type: application/json`. For protected routes, set:

```text
Authorization: Bearer {{token}}
```

After a successful login, save `token` from the response into the Postman `token` variable. For administrator routes, log in with an account whose role is `ADMIN`.

## Shared conventions

- JSON responses use `application/json`, except `204 No Content` responses, which have no response body.
- Timestamps are ISO 8601 strings. UUIDs identify records.
- List query parameters: `page` defaults to `1`; `limit` defaults to `20` and must be between `1` and `100`.
- Unknown request properties are rejected by strict request schemas.
- Standard API error body:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [{ "path": "body.title", "message": "Title is required" }]
  }
}
```

Validation errors use `400 VALIDATION_ERROR`; details contain `path` and `message`. Other common errors are `400 INVALID_JSON`, `401 UNAUTHORIZED`, `401 INVALID_TOKEN`, `401 INVALID_CREDENTIALS`, `403 FORBIDDEN`, `404 NOT_FOUND` or resource-specific not-found codes, `409 RESOURCE_CONFLICT`, `429 LOGIN_RATE_LIMITED`, and `500 INTERNAL_SERVER_ERROR`. `details` is an array (possibly empty).

## Health and root

### `GET /health`

No input. Checks PostgreSQL connectivity.

`200`:

```json
{ "status": "ok" }
```

`503` when the database check fails:

```json
{ "status": "unavailable" }
```

### `GET /`

No input. `200`:

```json
{ "message": "Welcome to Bookstore API" }
```

## Authentication

### `POST /api/v1/auth/register`

Public. JSON body (both fields required):

```json
{ "email": "reader@example.com", "password": "reading123" }
```

Email must be valid and at most 320 characters. Password must be 8–128 characters. Do not send `role`; extra properties are rejected. Email is trimmed and lowercased. Public registration always creates a `USER`.

`201`:

```json
{
  "user": {
    "id": "UUID",
    "email": "reader@example.com",
    "role": "USER",
    "createdAt": "2026-01-01T12:00:00.000Z",
    "updatedAt": "2026-01-01T12:00:00.000Z"
  }
}
```

Duplicate email: `409 RESOURCE_CONFLICT`. Password hashes are never returned.

### `POST /api/v1/auth/login`

Public. JSON body:

```json
{ "email": "reader@example.com", "password": "reading123" }
```

`200` (token value abbreviated):

```json
{
  "token": "eyJ...",
  "user": { "id": "UUID", "email": "reader@example.com", "role": "USER" }
}
```

Save `token` for subsequent protected requests. Wrong email/password: `401 INVALID_CREDENTIALS` with `{ "error": { "code": "INVALID_CREDENTIALS", "message": "Invalid email or password", "details": [] } }`. More than 10 failed attempts in 15 minutes from the same client is rate limited with `429 LOGIN_RATE_LIMITED`; successful requests are excluded from that count.

## Books

Book object fields: `id`, `title`, `isbn`, `description`, `publishedAt`, `createdAt`, `updatedAt`, `authors`, `categories`. Nullable fields (`isbn`, `description`, `publishedAt`) are JSON `null` when unset. `publishedAt` is serialized as a date/time string. `authors` and `categories` are arrays of their full objects, ordered by name. Author fields are `id`, `name`, `biography`, `createdAt`, `updatedAt`; category fields are `id`, `name`, `slug`, `createdAt`, `updatedAt`.

### `GET /api/v1/books`

Public. Optional query: `search` (1–100 characters, title substring, case-insensitive), `authorId` (UUID), `categoryId` (UUID), `page`, `limit`.

Example: `GET {{baseUrl}}/api/v1/books?search=sea&page=1&limit=10`

`200`:

```json
{
  "books": [
    {
      "id": "UUID",
      "title": "The Sea",
      "isbn": null,
      "description": null,
      "publishedAt": null,
      "createdAt": "2026-01-01T12:00:00.000Z",
      "updatedAt": "2026-01-01T12:00:00.000Z",
      "authors": [],
      "categories": []
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

### `GET /api/v1/books/:bookId`

Public. `bookId` must be a UUID. `200`: `{ "book": BOOK_OBJECT }`. Missing book: `404 BOOK_NOT_FOUND`.

### `POST /api/v1/books`

Admin bearer token required. JSON body:

```json
{
  "title": "The Sea",
  "isbn": "9780306406157",
  "description": "A short description",
  "publishedAt": "2024-03-15",
  "authorIds": ["AUTHOR_UUID"],
  "categoryIds": ["CATEGORY_UUID"]
}
```

Required: `title` (trimmed, 1–255 characters). Optional: `isbn` (ISBN-10 or ISBN-13; separators and an `ISBN` prefix are accepted and normalized), `description` (up to 10,000 characters or `null`), `publishedAt` (`YYYY-MM-DD` or `null`), `authorIds` and `categoryIds` (UUID arrays, max 50 each; omitted arrays default to empty). `201`: `{ "book": BOOK_OBJECT }`. Invalid related IDs: `400 INVALID_BOOK_RELATION`; duplicate ISBN: `409 RESOURCE_CONFLICT`.

### `PATCH /api/v1/books/:bookId`

Admin bearer token required. UUID path. Send one or more of the same fields as create; every field is optional, but an empty object is rejected. Sending `authorIds` or `categoryIds` replaces the complete relationship list; send `[]` to clear it. Sending nullable fields as `null` clears them. `200`: `{ "book": BOOK_OBJECT }`. Missing book: `404 RESOURCE_NOT_FOUND`. Invalid related IDs: `400 INVALID_BOOK_RELATION`.

Example body:

```json
{ "title": "The Sea, revised", "categoryIds": [] }
```

### `DELETE /api/v1/books/:bookId`

Admin bearer token required. UUID path. `204` with no body on success. Missing book: `404 RESOURCE_NOT_FOUND`.

## Authors

### `GET /api/v1/authors`

Public. Optional `page` and `limit`. `200`:

```json
{
  "authors": [{ "id": "UUID", "name": "A. Writer", "biography": null, "createdAt": "2026-01-01T12:00:00.000Z", "updatedAt": "2026-01-01T12:00:00.000Z" }],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

### `GET /api/v1/authors/:authorId`

Public. UUID path. `200`: `{ "author": AUTHOR_OBJECT }`. Missing author: `404 AUTHOR_NOT_FOUND`.

### `POST /api/v1/authors`

Admin bearer token required. Body:

```json
{ "name": "A. Writer", "biography": "Optional biography" }
```

`name` is required (1–200 characters). `biography` is optional, nullable, max 5,000 characters. `201`: `{ "author": AUTHOR_OBJECT }`.

### `PATCH /api/v1/authors/:authorId`

Admin bearer token required. UUID path. Body contains one or both of `name` and `biography`; empty object rejected. `biography: null` clears it. `200`: `{ "author": AUTHOR_OBJECT }`. Missing author: `404 RESOURCE_NOT_FOUND`.

### `DELETE /api/v1/authors/:authorId`

Admin bearer token required. UUID path. `204` with no body. Missing author: `404 RESOURCE_NOT_FOUND`.

## Categories

### `GET /api/v1/categories`

Public. Optional `page` and `limit`. `200`:

```json
{
  "categories": [{ "id": "UUID", "name": "Literary fiction", "slug": "literary-fiction", "createdAt": "2026-01-01T12:00:00.000Z", "updatedAt": "2026-01-01T12:00:00.000Z" }],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

### `GET /api/v1/categories/:categoryId`

Public. UUID path. `200`: `{ "category": CATEGORY_OBJECT }`. Missing category: `404 CATEGORY_NOT_FOUND`.

### `POST /api/v1/categories`

Admin bearer token required. Body:

```json
{ "name": "Literary fiction", "slug": "literary-fiction" }
```

Both fields required. `name` is 1–100 characters. `slug` is 1–120 characters and allows lowercase letters, digits, and single hyphens; uppercase input is normalized to lowercase. `201`: `{ "category": CATEGORY_OBJECT }`. Duplicate name or slug: `409 RESOURCE_CONFLICT`.

### `PATCH /api/v1/categories/:categoryId`

Admin bearer token required. UUID path. Body contains `name`, `slug`, or both; empty object rejected. `200`: `{ "category": CATEGORY_OBJECT }`. Missing category: `404 RESOURCE_NOT_FOUND`; duplicate name/slug: `409 RESOURCE_CONFLICT`.

### `DELETE /api/v1/categories/:categoryId`

Admin bearer token required. UUID path. `204` with no body. Missing category: `404 RESOURCE_NOT_FOUND`.

## Personal reading list

All routes below require a valid bearer token. The user identity is taken from that token; there is no `userId` input field. Entry fields: `id`, `userId`, `bookId`, `status`, `notes`, `createdAt`, `updatedAt`, `book`. The nested `book` includes the book fields plus full `authors` and `categories` arrays. `status` is `TO_READ`, `READING`, or `COMPLETED`; new entries default to `TO_READ`; `notes` may be `null`.

### `GET /api/v1/me/reading-list`

Optional `page` and `limit`. `200`:

```json
{
  "entries": [
    {
      "id": "ITEM_UUID",
      "userId": "USER_UUID",
      "bookId": "BOOK_UUID",
      "status": "TO_READ",
      "notes": null,
      "createdAt": "2026-01-01T12:00:00.000Z",
      "updatedAt": "2026-01-01T12:00:00.000Z",
      "book": {
        "id": "BOOK_UUID",
        "title": "The Sea",
        "isbn": null,
        "description": null,
        "publishedAt": null,
        "createdAt": "2026-01-01T12:00:00.000Z",
        "updatedAt": "2026-01-01T12:00:00.000Z",
        "authors": [],
        "categories": []
      }
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

Only the authenticated user's entries are returned.

### `POST /api/v1/me/reading-list`

Body: `{ "bookId": "BOOK_UUID" }`. `201`: `{ "entry": ENTRY_OBJECT }`. Missing book: `404 BOOK_NOT_FOUND`. Adding the same book twice for the same user violates the unique constraint and returns `409 RESOURCE_CONFLICT`.

### `PATCH /api/v1/me/reading-list/:itemId`

UUID path. Body must contain `status`, `notes`, or both. Status must be one of the three enum values. Notes are optional, nullable, and max 2,000 characters; `null` clears notes. `200`: `{ "entry": ENTRY_OBJECT }`. Missing item, or item belonging to another user: `404 READING_LIST_ITEM_NOT_FOUND`.

Example body:

```json
{ "status": "READING", "notes": "Pick up at chapter three." }
```

### `DELETE /api/v1/me/reading-list/:itemId`

UUID path. Deletes only an entry owned by the authenticated user. `204` with no body. Missing item or item owned by another user: `404 READING_LIST_ITEM_NOT_FOUND`.

## Development-only routes

These routes exist only when `NODE_ENV=development`; they are absent in test and production modes.

- `GET /_dev/protected`: valid bearer token required; `200` `{ "user": { "id": "UUID", "email": "reader@example.com", "role": "USER" } }`.
- `GET /_dev/admin`: valid admin bearer token required; `200` `{ "ok": true, "user": { "id": "UUID", "email": "admin@example.com", "role": "ADMIN" } }`; a regular user receives `403 FORBIDDEN`.
- `POST /_dev/validation`: JSON `{ "value": "abc" }` returns `200` `{ "body": { "value": "abc" } }`; `value` must be a string with at least 3 characters.

## Suggested Postman verification order

1. `GET /health` and confirm `200` / `{"status":"ok"}`.
2. Register a fresh reader, then log in and save the returned token.
3. List books/authors/categories, using pagination and book search/filter query parameters.
4. With the reader token, add a book to the reading list, list it, update status/notes, then delete it.
5. Verify access control: no token on a reading-list route should return `401`; use a reader token on a catalog `POST` to get `403`.
6. Log in as admin, create an author and category, create a book linked to them, then patch and delete the catalog records.
7. Verify bad input (`page=0`, malformed UUID, empty PATCH body, bad enum) returns `400`; verify duplicate email/ISBN/category values return `409`.

Use fresh emails and unique ISBN/category slugs when repeating create requests. Save UUIDs from creation responses into Postman variables and reuse them in path parameters and relationship arrays.
