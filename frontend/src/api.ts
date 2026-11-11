export type Author = {
  id: string;
  name: string;
  biography: string | null;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
};

export type Book = {
  id: string;
  title: string;
  isbn: string | null;
  description: string | null;
  publishedAt: string | null;
  authors: Author[];
  categories: Category[];
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type ApiErrorPayload = {
  error?: {
    message?: string;
  };
};

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  const controller = new AbortController();
  let timedOut = false;
  const abortRequest = () => controller.abort();
  signal?.addEventListener('abort', abortRequest, { once: true });
  const timeout = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 12000);

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    if (timedOut) throw new Error('The bookshop is taking too long to respond. Please try again.');
    throw new Error('We could not reach the bookshop. Check your connection and try again.');
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener('abort', abortRequest);
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
    if (response.status === 404) throw new Error('We couldn’t find what you were looking for.');
    throw new Error(payload?.error?.message || 'Something went wrong while loading this page.');
  }

  return response.json() as Promise<T>;
}

export async function getBooks(
  params: { search?: string; authorId?: string; categoryId?: string; page?: number; limit?: number } = {},
  signal?: AbortSignal,
): Promise<{ books: Book[]; pagination: Pagination }> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.authorId) query.set('authorId', params.authorId);
  if (params.categoryId) query.set('categoryId', params.categoryId);
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 12));
  return request(`/books?${query}`, signal);
}

export async function getBook(id: string, signal?: AbortSignal): Promise<Book> {
  const result = await request<{ book: Book }>(`/books/${encodeURIComponent(id)}`, signal);
  return result.book;
}

export async function getAuthors(signal?: AbortSignal): Promise<Author[]> {
  const result = await request<{ authors: Author[] }>('/authors', signal);
  return result.authors;
}

export async function getAuthor(id: string, signal?: AbortSignal): Promise<Author> {
  const result = await request<{ author: Author }>(`/authors/${encodeURIComponent(id)}`, signal);
  return result.author;
}

export async function getCategories(signal?: AbortSignal): Promise<Category[]> {
  const result = await request<{ categories: Category[] }>('/categories', signal);
  return result.categories;
}

export async function getCategory(id: string, signal?: AbortSignal): Promise<Category> {
  const result = await request<{ category: Category }>(`/categories/${encodeURIComponent(id)}`, signal);
  return result.category;
}
