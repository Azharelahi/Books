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

export type User = {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
};

export type ReadingStatus = 'TO_READ' | 'READING' | 'COMPLETED';

export type ReadingListEntry = {
  id: string;
  status: ReadingStatus;
  notes: string | null;
  book: Book;
};

export type ApiErrorDetail = {
  path?: string;
  message?: string;
};

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: ApiErrorDetail[];
  };
};

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly details: ApiErrorDetail[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: { signal?: AbortSignal; token?: string; method?: string; body?: unknown } = {},
): Promise<T> {
  const { signal, token, method = 'GET', body } = options;
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
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
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
    const message = response.status === 404
      ? 'We couldn’t find what you were looking for.'
      : payload?.error?.message || 'Something went wrong while loading this page.';
    throw new ApiError(message, response.status, payload?.error?.code || 'REQUEST_FAILED', payload?.error?.details || []);
  }

  if (response.status === 204) return undefined as T;
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
  return request(`/books?${query}`, { signal });
}

export async function getBook(id: string, signal?: AbortSignal): Promise<Book> {
  const result = await request<{ book: Book }>(`/books/${encodeURIComponent(id)}`, { signal });
  return result.book;
}

export async function getAuthors(signal?: AbortSignal): Promise<Author[]> {
  const result = await request<{ authors: Author[] }>('/authors', { signal });
  return result.authors;
}

export async function getAuthor(id: string, signal?: AbortSignal): Promise<Author> {
  const result = await request<{ author: Author }>(`/authors/${encodeURIComponent(id)}`, { signal });
  return result.author;
}

export async function getCategories(signal?: AbortSignal): Promise<Category[]> {
  const result = await request<{ categories: Category[] }>('/categories', { signal });
  return result.categories;
}

export async function getCategory(id: string, signal?: AbortSignal): Promise<Category> {
  const result = await request<{ category: Category }>(`/categories/${encodeURIComponent(id)}`, { signal });
  return result.category;
}

export async function register(email: string, password: string): Promise<User> {
  const result = await request<{ user: User }>('/auth/register', { method: 'POST', body: { email, password } });
  return result.user;
}

export async function login(email: string, password: string): Promise<{ token: string; user: User }> {
  return request('/auth/login', { method: 'POST', body: { email, password } });
}

export async function getReadingList(token: string, signal?: AbortSignal): Promise<ReadingListEntry[]> {
  const result = await request<{ entries: ReadingListEntry[] }>('/me/reading-list', { token, signal });
  return result.entries;
}

export async function addReadingListItem(token: string, bookId: string): Promise<ReadingListEntry> {
  const result = await request<{ entry: ReadingListEntry }>('/me/reading-list', {
    token,
    method: 'POST',
    body: { bookId },
  });
  return result.entry;
}

export async function updateReadingListItem(
  token: string,
  itemId: string,
  update: { status?: ReadingStatus; notes?: string | null },
): Promise<ReadingListEntry> {
  const result = await request<{ entry: ReadingListEntry }>(`/me/reading-list/${encodeURIComponent(itemId)}`, {
    token,
    method: 'PATCH',
    body: update,
  });
  return result.entry;
}

export async function deleteReadingListItem(token: string, itemId: string): Promise<void> {
  await request<void>(`/me/reading-list/${encodeURIComponent(itemId)}`, {
    token,
    method: 'DELETE',
  });
}
