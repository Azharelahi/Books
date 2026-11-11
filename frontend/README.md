# Bookstore storefront

The customer-facing frontend is a separate React, TypeScript, and Vite application. It talks to the Express API; it does not contain a separate catalog or mock data.

## Local development

1. Start the API from the repository root with `npm run dev`. The API listens on port `3000` by default.
2. In another terminal, run `npm install --prefix frontend`.
3. Run `npm run dev --prefix frontend` and open the local Vite URL printed in the terminal.

Vite proxies `/api/v1` to `http://localhost:3000`. To use another API path, create `frontend/.env.local` based on `.env.example` and set `VITE_API_BASE_URL` to the API's `/api/v1` base URL. For a deployed frontend, configure a same-origin reverse proxy for that path. The current API does not configure cross-origin requests, so a separate API origin requires CORS support before using a direct URL.

The storefront routes are `/`, `/books`, `/books/:bookId`, `/authors`, `/authors/:authorId`, `/categories`, `/categories/:categoryId`, `/register`, `/login`, and `/reading-list`. Book search, filters, and pagination are kept in the URL so views can be bookmarked and shared. The reading list is protected; after sign-in, users return to the page that prompted authentication.

Authentication uses the API's bearer-token response and keeps the token in `sessionStorage` for the browser tab session. Sign out clears it. The API remains authoritative for authorization and ownership. Registration creates the account, then prompts the user to sign in.

The account and reading-list screens use `POST /auth/register`, `POST /auth/login`, and the protected `/me/reading-list` GET/POST/PATCH/DELETE endpoints under `/api/v1`. Reading-list status and notes are updated through the API, not kept only in the browser.

## Build

Run `npm run build --prefix frontend` to type-check and create the production bundle in `frontend/dist`.
