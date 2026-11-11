# Bookstore storefront

The customer-facing frontend is a separate React, TypeScript, and Vite application. It talks to the Express API; it does not contain a separate catalog or mock data.

## Local development

1. Start the API from the repository root with `npm run dev`. The API listens on port `3000` by default.
2. In another terminal, run `npm install --prefix frontend`.
3. Run `npm run dev --prefix frontend` and open the local Vite URL printed in the terminal.

Vite proxies `/api/v1` to `http://localhost:3000`. To use another API path, create `frontend/.env.local` based on `.env.example` and set `VITE_API_BASE_URL` to the API's `/api/v1` base URL. For a deployed frontend, configure a same-origin reverse proxy for that path. The current API does not configure cross-origin requests, so a separate API origin requires CORS support before using a direct URL.

The public routes are `/`, `/books`, `/books/:bookId`, `/authors`, `/authors/:authorId`, `/categories`, and `/categories/:categoryId`. Book search, filters, and pagination are kept in the URL so views can be bookmarked and shared.

## Build

Run `npm run build --prefix frontend` to type-check and create the production bundle in `frontend/dist`.
