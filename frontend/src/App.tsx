import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  addReadingListItem,
  ApiError,
  deleteReadingListItem,
  getAuthor,
  getAuthors,
  getBook,
  getBooks,
  getCategories,
  getCategory,
  getReadingList,
  login,
  register,
  updateReadingListItem,
  type Book,
  type Pagination,
  type ReadingListEntry,
  type ReadingStatus,
} from './api';
import { useAuth } from './auth';

function useResource<T>(load: (signal: AbortSignal) => Promise<T>, dependencies: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    load(controller.signal)
      .then(setData)
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : 'Something went wrong.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [...dependencies, attempt]);

  return { data, error, loading, retry: () => setAttempt((value) => value + 1) };
}

function Header() {
  const { user, signOut } = useAuth();
  const links = [
    { to: '/books', label: 'Books' },
    { to: '/authors', label: 'Authors' },
    { to: '/categories', label: 'Shelves' },
  ];

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="wordmark" to="/" aria-label="Marginalia home">
          marginalia<span>.</span>
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="header-account">
          {user ? (
            <>
              <Link className="account-reading-link" to="/reading-list">My reading list</Link>
              <span className="account-email">{user.email}</span>
              <button className="sign-out-button" onClick={signOut}>Sign out</button>
            </>
          ) : (
            <>
              <Link className="account-reading-link" to="/login">Sign in</Link>
              <Link className="header-cta" to="/register">Create account <span aria-hidden="true">↗</span></Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <Link className="wordmark footer-mark" to="/">
        marginalia<span>.</span>
      </Link>
      <p>A little more room for a good story.</p>
      <span className="footer-note">For the curious · No rush</span>
    </footer>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Header />
      <main id="main-content">{children}</main>
      <Footer />
    </>
  );
}

function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="feedback error-state" role="alert">
      <span className="feedback-icon" aria-hidden="true">!</span>
      <div>
        <strong>We hit a small snag.</strong>
        <p>{message}</p>
        {retry && <button className="text-button" onClick={retry}>Try again ↗</button>}
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="book-grid" aria-label="Loading books" aria-busy="true">
      {Array.from({ length: 4 }, (_, index) => <div className="skeleton-book" key={index} />)}
    </div>
  );
}

function BookCover({ book, index = 0, large = false }: { book: Book; index?: number; large?: boolean }) {
  const palette = ['cover-olive', 'cover-rose', 'cover-blue', 'cover-ochre', 'cover-plum'];
  const color = palette[index % palette.length];
  return (
    <div className={`book-cover ${color}${large ? ' cover-large' : ''}`} aria-label={`Illustrated placeholder cover for ${book.title}`}>
      <span className="cover-topline">MARGINALIA · SELECTED READS</span>
      <span className="cover-title">{book.title}</span>
      <span className="cover-rule" />
      <span className="cover-author">{book.authors.map((author) => author.name).join(' · ') || 'A good story'}</span>
      <span className="cover-mark" aria-hidden="true">✳</span>
    </div>
  );
}

function BookCard({ book, index }: { book: Book; index: number }) {
  return (
    <article className="book-card">
      <Link className="book-card-link" to={`/books/${book.id}`} aria-label={`View ${book.title}`}>
        <BookCover book={book} index={index} />
        <div className="book-card-info">
          <div className="book-card-meta">
            <span>{book.categories[0]?.name || 'From the collection'}</span>
            {book.publishedAt && <span>{new Date(book.publishedAt).getUTCFullYear()}</span>}
          </div>
          <h3>{book.title}</h3>
          <p>{book.authors.map((author) => author.name).join(', ') || 'Unknown author'}</p>
        </div>
      </Link>
    </article>
  );
}

function BookGrid({ books }: { books: Book[] }) {
  if (!books.length) {
    return (
      <div className="empty-state">
        <span aria-hidden="true">⌕</span>
        <h2>No books on this shelf yet</h2>
        <p>Try a different search or clear a filter to explore the collection.</p>
      </div>
    );
  }
  return <div className="book-grid">{books.map((book, index) => <BookCard key={book.id} book={book} index={index} />)}</div>;
}

function PaginationControls({ pagination, onPageChange }: { pagination: Pagination; onPageChange: (page: number) => void }) {
  if (pagination.totalPages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Book pages">
      <button disabled={pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)}>← Previous</button>
      <span>Page <strong>{pagination.page}</strong> of {pagination.totalPages}</span>
      <button disabled={pagination.page >= pagination.totalPages} onClick={() => onPageChange(pagination.page + 1)}>Next →</button>
    </nav>
  );
}

function HomePage() {
  const books = useResource((signal) => getBooks({ page: 1, limit: 4 }, signal), []);
  const categories = useResource((signal) => getCategories(signal), []);
  const featuredBooks = books.data?.books ?? [];

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-line" /> A bookshop for the curious</span>
          <h1>Find a story<br />that <em>stays</em> with you.</h1>
          <p>Good books make a little more room in the world. Find your next one in a collection made for wandering minds.</p>
          <div className="hero-actions">
            <Link to="/books" className="button button-dark">Explore the books <span aria-hidden="true">↗</span></Link>
            <Link to="/categories" className="quiet-link">Browse by shelf <span aria-hidden="true">→</span></Link>
          </div>
          <div className="hero-footnote"><span className="footnote-star">✳</span> Thoughtfully gathered, endlessly browsable</div>
        </div>
        <div className="hero-art" aria-label="Decorative illustration of a stack of books">
          <div className="sun-disc" />
          <div className="hero-quote">A small world<br />of its own.</div>
          <div className="hero-stack">
            <div className="stack-book stack-book-back"><span>STAY AWHILE</span></div>
            <div className="stack-book stack-book-mid"><span>WONDER</span></div>
            <div className="stack-book stack-book-front"><span>READ ON</span></div>
          </div>
          <span className="art-caption">A good place to begin <span>✳</span></span>
        </div>
      </section>

      <section className="home-categories section-wrap">
        <div className="section-heading">
          <div><span className="eyebrow">Follow a thread</span><h2>Find your kind of <em>curious.</em></h2></div>
          <Link className="underlined-link" to="/categories">All shelves <span aria-hidden="true">↗</span></Link>
        </div>
        {categories.error ? <ErrorState message={categories.error} retry={categories.retry} /> : null}
        {categories.loading ? <div className="category-skeleton" aria-label="Loading shelves" /> : (
          <div className="category-chips">
            {categories.data?.length ? categories.data.slice(0, 8).map((category, index) => (
              <Link className={`category-chip chip-${index % 4}`} key={category.id} to={`/categories/${category.id}`}>
                <span>{category.name}</span><span aria-hidden="true">↗</span>
              </Link>
            )) : !categories.error ? <p className="muted-copy">New shelves are being arranged. Check back soon.</p> : null}
          </div>
        )}
      </section>

      <section className="featured-section">
        <div className="section-wrap">
          <div className="section-heading">
            <div><span className="eyebrow">A few good places to start</span><h2>Picked for your <em>next chapter.</em></h2></div>
            <Link className="underlined-link" to="/books">The whole collection <span aria-hidden="true">↗</span></Link>
          </div>
          {books.error ? <ErrorState message={books.error} retry={books.retry} /> : books.loading ? <LoadingGrid /> : <BookGrid books={featuredBooks} />}
        </div>
      </section>
      <section className="closing-note section-wrap">
        <span className="closing-star" aria-hidden="true">✳</span>
        <p>There’s no rush. The right book has a way of finding its way to you.</p>
        <Link className="underlined-link" to="/books">Take a look around <span aria-hidden="true">↗</span></Link>
      </section>
    </>
  );
}

function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('search') || '';
  const authorId = searchParams.get('authorId') || '';
  const categoryId = searchParams.get('categoryId') || '';
  const requestedPage = Number(searchParams.get('page'));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [searchValue, setSearchValue] = useState(query);
  const authors = useResource((signal) => getAuthors(signal), []);
  const categories = useResource((signal) => getCategories(signal), []);
  const result = useResource((signal) => getBooks({ search: query, authorId, categoryId, page, limit: 12 }, signal), [query, authorId, categoryId, page]);

  useEffect(() => setSearchValue(query), [query]);
  useEffect(() => {
    const rawPage = searchParams.get('page');
    if (rawPage && rawPage !== String(page)) {
      const next = new URLSearchParams(searchParams);
      next.set('page', String(page));
      setSearchParams(next, { replace: true });
    }
  }, [page, searchParams, setSearchParams]);
  useEffect(() => {
    if (!result.data) return;
    const lastPage = Math.max(1, result.data.pagination.totalPages);
    if (page > lastPage) {
      const next = new URLSearchParams(searchParams);
      next.set('page', String(lastPage));
      setSearchParams(next, { replace: true });
    }
  }, [page, result.data, searchParams, setSearchParams]);

  function updateFilters(values: Record<string, string>) {
    const next = new URLSearchParams(searchParams);
    Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    next.delete('page');
    setSearchParams(next);
  }

  function changePage(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const pagination: Pagination | undefined = result.data?.pagination;

  return (
    <div className="page-wrap">
      <div className="page-intro">
        <span className="eyebrow">The collection</span>
        <h1>Books for every<br /><em>kind of wondering.</em></h1>
        <p>Take the scenic route. Search a title, follow an author, or see where a shelf leads.</p>
      </div>
      {authors.error && <ErrorState message={`Author filters are unavailable. ${authors.error}`} retry={authors.retry} />}
      {categories.error && <ErrorState message={`Shelf filters are unavailable. ${categories.error}`} retry={categories.retry} />}
      <div className="catalog-tools">
        <form className="search-form" role="search" onSubmit={(event) => {
          event.preventDefault();
          updateFilters({ search: searchValue.trim() });
        }}>
          <label className="sr-only" htmlFor="book-search">Search books by title</label>
          <span className="search-icon" aria-hidden="true">⌕</span>
          <input id="book-search" type="search" value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder="Search book titles…" />
          <button type="submit" className="search-submit">Search</button>
        </form>
        <div className="filter-row">
          <label className="filter-control">
            <span className="sr-only">Filter by author</span>
            <select value={authorId} onChange={(event) => updateFilters({ authorId: event.target.value })}>
              <option value="">All authors</option>
              {authors.data?.map((author) => <option key={author.id} value={author.id}>{author.name}</option>)}
            </select>
          </label>
          <label className="filter-control">
            <span className="sr-only">Filter by shelf</span>
            <select value={categoryId} onChange={(event) => updateFilters({ categoryId: event.target.value })}>
              <option value="">All shelves</option>
              {categories.data?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          {(query || authorId || categoryId) && <button className="clear-filters" onClick={() => setSearchParams({})}>Clear filters <span aria-hidden="true">×</span></button>}
          {pagination && <span className="result-count">{pagination.total} {pagination.total === 1 ? 'book' : 'books'} to wander through</span>}
        </div>
      </div>

      {result.error ? <ErrorState message={result.error} retry={result.retry} /> : result.loading ? <LoadingGrid /> : <BookGrid books={result.data?.books ?? []} />}
      {pagination && <PaginationControls pagination={pagination} onPageChange={changePage} />}
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, redirectState } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={redirectState ?? { from: location }} />;
  return children;
}

function getReturnLocation(state: unknown): { path: string; state?: { readingNotes: Record<string, string> } } {
  if (!state || typeof state !== 'object' || !('from' in state)) return { path: '/reading-list' };
  const from = state.from;
  if (!from || typeof from !== 'object' || !('pathname' in from) || typeof from.pathname !== 'string') {
    return { path: '/reading-list' };
  }
  if (!from.pathname.startsWith('/') || from.pathname.startsWith('//')) return { path: '/reading-list' };
  const search = 'search' in from && typeof from.search === 'string' ? from.search : '';
  const hash = 'hash' in from && typeof from.hash === 'string' ? from.hash : '';
  const routeState = 'readingNotes' in state &&
    state.readingNotes &&
    typeof state.readingNotes === 'object' &&
    !Array.isArray(state.readingNotes)
    ? { readingNotes: state.readingNotes as Record<string, string> }
    : undefined;
  return { path: `${from.pathname}${search}${hash}`, state: routeState };
}

function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const isLogin = mode === 'login';
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { email?: string; readingNotes?: Record<string, string> } | null;
  const [email, setEmail] = useState(state?.email || '');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const errors: { email?: string; password?: string } = {};
    const normalizedEmail = email.trim();
    if (!normalizedEmail || normalizedEmail.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      errors.email = 'Enter a valid email address.';
    }
    if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
    else if (password.length > 128) errors.password = 'Password must be 128 characters or fewer.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    setSuccess('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      if (isLogin) {
        const session = await login(email.trim(), password);
        signIn(session.token);
        const destination = getReturnLocation(location.state);
        navigate(destination.path, { replace: true, state: destination.state });
      } else {
        await register(email.trim(), password);
        setPassword('');
        setSuccess('Your account is ready. Sign in to start your reading list.');
      }
    } catch (cause) {
      if (cause instanceof ApiError && cause.details.length) {
        const errors: { email?: string; password?: string } = {};
        for (const detail of cause.details) {
          const field = detail.path?.split('.').pop();
          if (field === 'email' || field === 'password') errors[field] = detail.message || 'Check this field.';
        }
        setFieldErrors(errors);
        if (!Object.keys(errors).length) setFormError(cause.message);
      } else {
        setFormError(cause instanceof Error ? cause.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-art" aria-hidden="true">
        <span className="auth-art-star">✳</span>
        <p>Every good story<br />begins somewhere.</p>
        <span className="auth-art-note">Perhaps here.</span>
      </div>
      <section className="auth-panel" aria-labelledby="auth-heading">
        <span className="eyebrow">{isLogin ? 'Welcome back' : 'A place to begin'}</span>
        <h1 id="auth-heading">{isLogin ? <>Good to<br /><em>see you.</em></> : <>Make room<br />for <em>stories.</em></>}</h1>
        <p className="auth-intro">{isLogin ? 'Sign in to pick up where you left off.' : 'Create an account to keep your reading close.'}</p>
        {success ? (
          <div className="auth-success" role="status">
            <span aria-hidden="true">✳</span>
            <p>{success}</p>
            <Link className="button button-dark" to="/login" state={{ email: email.trim() }}>Continue to sign in <span aria-hidden="true">↗</span></Link>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {formError && <div className="form-alert" role="alert">{formError}</div>}
            <div className="field-group">
              <label htmlFor="account-email">Email address</label>
              <input
                autoComplete="email"
                id="account-email"
                type="email"
                value={email}
                maxLength={320}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'account-email-error' : undefined}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setFieldErrors((current) => ({ ...current, email: undefined }));
                }}
              />
              {fieldErrors.email && <span className="field-error" id="account-email-error">{fieldErrors.email}</span>}
            </div>
            <div className="field-group">
              <label htmlFor="account-password">Password</label>
              <input
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                id="account-password"
                type="password"
                value={password}
                maxLength={128}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'account-password-error' : undefined}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setFieldErrors((current) => ({ ...current, password: undefined }));
                }}
              />
              {fieldErrors.password && <span className="field-error" id="account-password-error">{fieldErrors.password}</span>}
              <span className="field-hint">At least 8 characters.</span>
            </div>
            <button className="button button-dark auth-submit" type="submit" disabled={submitting}>
              {submitting ? 'One moment…' : isLogin ? 'Sign in' : 'Create account'}
              {!submitting && <span aria-hidden="true">↗</span>}
            </button>
          </form>
        )}
        {!success && (
          <p className="auth-switch">
            {isLogin ? 'New to Marginalia?' : 'Already have an account?'}{' '}
            <Link to={isLogin ? '/register' : '/login'} state={isLogin ? location.state : { email: email.trim() }}>
              {isLogin ? 'Create an account' : 'Sign in'}
            </Link>
          </p>
        )}
        <p className="auth-privacy">Your password is sent to the bookshop API and is never stored in this browser.</p>
      </section>
    </div>
  );
}

function AddToReadingList({ bookId }: { bookId: string }) {
  const { token, user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pending, setPending] = useState(false);
  const [added, setAdded] = useState(false);
  const [message, setMessage] = useState('');

  async function addBook() {
    if (!token) return;
    setPending(true);
    setMessage('');
    try {
      await addReadingListItem(token, bookId);
      setAdded(true);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        signOut();
        navigate('/login', { replace: true, state: { from: location } });
        return;
      }
      setMessage(cause instanceof Error ? cause.message : 'This book could not be added right now.');
    } finally {
      setPending(false);
    }
  }

  if (!user) {
    return <div className="save-book-prompt">
      <Link className="button button-dark" to="/login" state={{ from: location }}>Sign in to save this book <span aria-hidden="true">↗</span></Link>
      <span>Keep your next read close at hand.</span>
    </div>;
  }

  return (
    <div className="save-book-prompt">
      {added ? (
        <Link className="button button-dark" to="/reading-list">Added to your reading list <span aria-hidden="true">↗</span></Link>
      ) : (
        <button className="button button-dark" onClick={addBook} disabled={pending}>
          {pending ? 'Adding…' : 'Add to my reading list'} {!pending && <span aria-hidden="true">↗</span>}
        </button>
      )}
      {message && <p className="inline-error" role="alert">{message}</p>}
      {!message && !added && <span>Keep your next read close at hand.</span>}
    </div>
  );
}

function BookDetailPage() {
  const { bookId = '' } = useParams();
  const result = useResource((signal) => getBook(bookId, signal), [bookId]);

  if (result.loading) return <div className="page-wrap"><div className="detail-skeleton" aria-label="Loading book" /></div>;
  if (result.error) return <div className="page-wrap"><ErrorState message={result.error} retry={result.retry} /><Link className="underlined-link back-link" to="/books">← Back to the collection</Link></div>;
  const book = result.data;
  if (!book) return null;

  return (
    <div className="page-wrap">
      <Link className="back-link underlined-link" to="/books">← Back to the collection</Link>
      <article className="book-detail">
        <div className="detail-cover-wrap"><BookCover book={book} large /></div>
        <div className="detail-copy">
          <span className="eyebrow">{book.categories[0]?.name || 'A book to discover'}</span>
          <h1>{book.title}</h1>
          <p className="detail-authors">
            {book.authors.length ? book.authors.map((author, index) => (
              <span key={author.id}>{index > 0 && ' · '}<Link to={`/authors/${author.id}`}>{author.name}</Link></span>
            )) : 'An undiscovered voice'}
          </p>
          {book.description ? <p className="detail-description">{book.description}</p> : <p className="detail-description muted-copy">Every book begins with a little mystery. More about this one may be added soon.</p>}
          <dl className="book-facts">
            {book.publishedAt && <div><dt>Published</dt><dd>{new Date(book.publishedAt).getUTCFullYear()}</dd></div>}
            {book.isbn && <div><dt>ISBN</dt><dd>{book.isbn}</dd></div>}
            {!!book.categories.length && <div><dt>On the shelf</dt><dd>{book.categories.map((category) => <Link key={category.id} to={`/categories/${category.id}`}>{category.name}</Link>)}</dd></div>}
          </dl>
          <AddToReadingList bookId={book.id} />
          <div className="detail-aside"><span aria-hidden="true">✳</span> No hurry. Take your time finding the right story.</div>
        </div>
      </article>
    </div>
  );
}

function AuthorsPage() {
  const result = useResource((signal) => getAuthors(signal), []);
  return (
    <div className="page-wrap">
      <div className="page-intro">
        <span className="eyebrow">The voices behind the pages</span>
        <h1>Meet the <em>storytellers.</em></h1>
        <p>Every book opens a conversation. Start with the people who put words to paper.</p>
      </div>
      {result.error ? <ErrorState message={result.error} retry={result.retry} /> : result.loading ? <div className="people-skeleton" /> : result.data?.length ? (
        <div className="author-grid">
          {result.data.map((author, index) => (
            <Link className={`author-card author-tone-${index % 4}`} to={`/authors/${author.id}`} key={author.id}>
              <span className="author-monogram" aria-hidden="true">{author.name.trim().charAt(0).toUpperCase()}</span>
              <span className="eyebrow">Author no. {String(index + 1).padStart(2, '0')}</span>
              <h2>{author.name}</h2>
              <span className="author-card-link">Meet the author <span aria-hidden="true">↗</span></span>
            </Link>
          ))}
        </div>
      ) : <div className="empty-state"><span aria-hidden="true">✳</span><h2>New voices, coming soon</h2><p>We’re still building this shelf. Come back for a fresh introduction.</p></div>}
    </div>
  );
}

function AuthorDetailPage() {
  const { authorId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPage = Number(searchParams.get('page'));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const author = useResource((signal) => getAuthor(authorId, signal), [authorId]);
  const books = useResource((signal) => getBooks({ authorId, page, limit: 12 }, signal), [authorId, page]);

  useEffect(() => {
    const rawPage = searchParams.get('page');
    if (rawPage && rawPage !== String(page)) {
      const next = new URLSearchParams(searchParams);
      next.set('page', String(page));
      setSearchParams(next, { replace: true });
    }
  }, [page, searchParams, setSearchParams]);
  useEffect(() => {
    if (!books.data) return;
    const lastPage = Math.max(1, books.data.pagination.totalPages);
    if (page > lastPage) {
      const next = new URLSearchParams(searchParams);
      next.set('page', String(lastPage));
      setSearchParams(next, { replace: true });
    }
  }, [books.data, page, searchParams, setSearchParams]);

  function changePage(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (author.loading) return <div className="page-wrap"><div className="detail-skeleton" /></div>;
  if (author.error) return <div className="page-wrap"><ErrorState message={author.error} retry={author.retry} /><Link className="underlined-link back-link" to="/authors">← All authors</Link></div>;
  const person = author.data;
  if (!person) return null;
  return (
    <div className="page-wrap">
      <Link className="back-link underlined-link" to="/authors">← All authors</Link>
      <section className="profile-hero">
        <div className="profile-monogram" aria-hidden="true">{person.name.trim().charAt(0).toUpperCase()}</div>
        <div><span className="eyebrow">A voice on our shelves</span><h1>{person.name}</h1></div>
      </section>
      {person.biography && <p className="profile-bio">{person.biography}</p>}
      <div className="section-heading profile-books-heading"><div><span className="eyebrow">In the collection</span><h2>Books by {person.name.split(' ')[0]}.</h2></div></div>
      {books.error ? <ErrorState message={books.error} retry={books.retry} /> : books.loading ? <LoadingGrid /> : <BookGrid books={books.data?.books ?? []} />}
      {books.data && <PaginationControls pagination={books.data.pagination} onPageChange={changePage} />}
    </div>
  );
}

function CategoriesPage() {
  const result = useResource((signal) => getCategories(signal), []);
  return (
    <div className="page-wrap">
      <div className="page-intro">
        <span className="eyebrow">A place for every kind of story</span>
        <h1>Browse by <em>feeling.</em></h1>
        <p>Follow your curiosity. You never know what might be waiting on the next shelf.</p>
      </div>
      {result.error ? <ErrorState message={result.error} retry={result.retry} /> : result.loading ? <div className="category-skeleton" /> : result.data?.length ? (
        <div className="shelf-grid">
          {result.data.map((category, index) => (
            <Link className={`shelf-card shelf-${index % 5}`} to={`/categories/${category.id}`} key={category.id}>
              <span className="shelf-index">SHELF {String(index + 1).padStart(2, '0')}</span>
              <span className="shelf-symbol" aria-hidden="true">{['✳', '◌', '⌁', '✷', '◈'][index % 5]}</span>
              <h2>{category.name}</h2>
              <span className="shelf-cta">Explore this shelf <span aria-hidden="true">↗</span></span>
            </Link>
          ))}
        </div>
      ) : <div className="empty-state"><span aria-hidden="true">◈</span><h2>The shelves are being arranged</h2><p>There will be something lovely to explore here soon.</p></div>}
    </div>
  );
}

function CategoryDetailPage() {
  const { categoryId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPage = Number(searchParams.get('page'));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const category = useResource((signal) => getCategory(categoryId, signal), [categoryId]);
  const books = useResource((signal) => getBooks({ categoryId, page, limit: 12 }, signal), [categoryId, page]);

  useEffect(() => {
    const rawPage = searchParams.get('page');
    if (rawPage && rawPage !== String(page)) {
      const next = new URLSearchParams(searchParams);
      next.set('page', String(page));
      setSearchParams(next, { replace: true });
    }
  }, [page, searchParams, setSearchParams]);
  useEffect(() => {
    if (!books.data) return;
    const lastPage = Math.max(1, books.data.pagination.totalPages);
    if (page > lastPage) {
      const next = new URLSearchParams(searchParams);
      next.set('page', String(lastPage));
      setSearchParams(next, { replace: true });
    }
  }, [books.data, page, searchParams, setSearchParams]);

  function changePage(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (category.loading) return <div className="page-wrap"><div className="detail-skeleton" /></div>;
  if (category.error) return <div className="page-wrap"><ErrorState message={category.error} retry={category.retry} /><Link className="underlined-link back-link" to="/categories">← All shelves</Link></div>;
  const shelf = category.data;
  if (!shelf) return null;
  return (
    <div className="page-wrap">
      <Link className="back-link underlined-link" to="/categories">← All shelves</Link>
      <div className="category-detail-intro"><span className="eyebrow">A shelf of its own · {shelf.slug}</span><h1>{shelf.name}<em>.</em></h1><p>A small corner of the collection, gathered around a shared thread.</p></div>
      <div className="section-heading"><div><span className="eyebrow">Take a closer look</span><h2>Stories on this shelf.</h2></div></div>
      {books.error ? <ErrorState message={books.error} retry={books.retry} /> : books.loading ? <LoadingGrid /> : <BookGrid books={books.data?.books ?? []} />}
      {books.data && <PaginationControls pagination={books.data.pagination} onPageChange={changePage} />}
    </div>
  );
}

function ReadingListPage() {
  const { token, expireSession } = useAuth();
  const location = useLocation();
  const restoredNotes = (location.state as { readingNotes?: Record<string, string> } | null)?.readingNotes;
  const [entries, setEntries] = useState<ReadingListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [filter, setFilter] = useState<'ALL' | ReadingStatus>('ALL');
  const [busyId, setBusyId] = useState('');
  const [confirmingId, setConfirmingId] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    getReadingList(token, controller.signal)
      .then((result) => {
        setEntries(result);
        const savedNotes = Object.fromEntries(result.map((entry) => [entry.id, entry.notes || '']));
        for (const entry of result) {
          const draft = restoredNotes?.[entry.id];
          if (typeof draft === 'string') savedNotes[entry.id] = draft;
        }
        setNotes(savedNotes);
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        if (cause instanceof ApiError && cause.status === 401) {
          expireSession({ from: location });
          return;
        }
        setLoadError(cause instanceof Error ? cause.message : 'Your reading list could not be loaded.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [token, attempt]);

  async function handleEntryAction(itemId: string, action: () => Promise<ReadingListEntry | void>) {
    setBusyId(itemId);
    setActionError('');
    try {
      const updated = await action();
      if (updated) setEntries((current) => current.map((entry) => entry.id === itemId ? updated : entry));
      return true;
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        expireSession({ from: location, readingNotes: notes });
        return false;
      }
      setActionError(cause instanceof Error ? cause.message : 'That change could not be saved.');
      return false;
    } finally {
      setBusyId('');
    }
  }

  async function saveStatus(itemId: string, status: ReadingStatus) {
    if (!token) return;
    await handleEntryAction(itemId, () => updateReadingListItem(token, itemId, { status }));
  }

  async function saveNotes(itemId: string) {
    if (!token) return;
    const value = notes[itemId]?.trim() || null;
    const saved = await handleEntryAction(itemId, () => updateReadingListItem(token, itemId, { notes: value }));
    if (saved) setNotes((current) => ({ ...current, [itemId]: value || '' }));
  }

  async function removeEntry(itemId: string) {
    if (!token) return;
    const removed = await handleEntryAction(itemId, async () => {
      await deleteReadingListItem(token, itemId);
    });
    if (removed) {
      setEntries((current) => current.filter((entry) => entry.id !== itemId));
      setNotes((current) => {
        const next = { ...current };
        delete next[itemId];
        return next;
      });
      setConfirmingId('');
    }
  }

  const visibleEntries = filter === 'ALL' ? entries : entries.filter((entry) => entry.status === filter);
  const counts = {
    ALL: entries.length,
    TO_READ: entries.filter((entry) => entry.status === 'TO_READ').length,
    READING: entries.filter((entry) => entry.status === 'READING').length,
    COMPLETED: entries.filter((entry) => entry.status === 'COMPLETED').length,
  };
  const labels: Record<ReadingStatus, string> = {
    TO_READ: 'Want to read',
    READING: 'Reading now',
    COMPLETED: 'Finished',
  };

  return (
    <div className="page-wrap reading-list-page">
      <div className="reading-list-heading">
        <div>
          <span className="eyebrow">Your own little corner</span>
          <h1>Your reading<br /><em>life, lately.</em></h1>
          <p>A place to keep the books you mean to read, the ones you’re in, and the ones you’ll remember.</p>
        </div>
        <span className="reading-list-mark" aria-hidden="true">✳</span>
      </div>

      {actionError && <div className="form-alert" role="alert">{actionError}</div>}
      {loading ? <LoadingGrid /> : loadError ? (
        <ErrorState message={loadError} retry={() => setAttempt((value) => value + 1)} />
      ) : entries.length ? (
        <>
          <div className="reading-filters" aria-label="Filter reading list">
            {(['ALL', 'TO_READ', 'READING', 'COMPLETED'] as const).map((status) => (
              <button
                className={filter === status ? 'reading-filter active' : 'reading-filter'}
                key={status}
                aria-pressed={filter === status}
                onClick={() => setFilter(status)}
              >
                {status === 'ALL' ? 'Everything' : labels[status]} <span>{counts[status]}</span>
              </button>
            ))}
          </div>
          {visibleEntries.length ? (
            <div className="reading-entry-list">
              {visibleEntries.map((entry, index) => (
                <article className="reading-entry" key={entry.id}>
                  <Link className="reading-entry-cover" to={`/books/${entry.book.id}`}>
                    <BookCover book={entry.book} index={index} />
                  </Link>
                  <div className="reading-entry-info">
                    <span className="eyebrow">{entry.book.categories[0]?.name || 'On your list'}</span>
                    <h2><Link to={`/books/${entry.book.id}`}>{entry.book.title}</Link></h2>
                    <p className="reading-entry-author">{entry.book.authors.map((author) => author.name).join(', ') || 'Unknown author'}</p>
                    <label className="reading-status-label" htmlFor={`status-${entry.id}`}>Where are you with it?</label>
                    <select
                      id={`status-${entry.id}`}
                      value={entry.status}
                      disabled={busyId === entry.id}
                      onChange={(event) => void saveStatus(entry.id, event.target.value as ReadingStatus)}
                    >
                      {(Object.keys(labels) as ReadingStatus[]).map((status) => <option key={status} value={status}>{labels[status]}</option>)}
                    </select>
                    <label className="notes-label" htmlFor={`notes-${entry.id}`}>A note to yourself <span>Optional</span></label>
                    <textarea
                      id={`notes-${entry.id}`}
                      value={notes[entry.id] ?? ''}
                      maxLength={2000}
                      rows={3}
                      placeholder="A thought, a page to find again…"
                      onChange={(event) => setNotes((current) => ({ ...current, [entry.id]: event.target.value }))}
                    />
                    <div className="entry-actions">
                      <button className="text-button" disabled={busyId === entry.id} onClick={() => void saveNotes(entry.id)}>
                        {busyId === entry.id ? 'Saving…' : 'Save note'}
                      </button>
                      {confirmingId === entry.id ? (
                        <span className="remove-confirm">
                          Remove this book?
                          <button className="text-button" disabled={busyId === entry.id} onClick={() => void removeEntry(entry.id)}>Yes, remove</button>
                          <button className="text-button" onClick={() => setConfirmingId('')}>Keep it</button>
                        </span>
                      ) : (
                        <button className="remove-button" disabled={busyId === entry.id} onClick={() => setConfirmingId(entry.id)}>Remove</button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state filter-empty">
              <span aria-hidden="true">✳</span><h2>Nothing on this shelf just yet</h2>
              <p>Move a book here by changing its reading status.</p>
              <button className="text-button" onClick={() => setFilter('ALL')}>Show everything</button>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state reading-empty">
          <span aria-hidden="true">✳</span>
          <h2>A fresh page</h2>
          <p>Your reading list is empty for now. Find a book that feels like the beginning of something.</p>
          <Link className="button button-dark" to="/books">Explore the collection <span aria-hidden="true">↗</span></Link>
        </div>
      )}
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="not-found">
      <span className="eyebrow">A little off the page</span>
      <h1>This story<br /><em>isn’t here.</em></h1>
      <p>The page may have wandered off, but there are plenty more to find.</p>
      <Link className="button button-dark" to="/">Back to the bookshop <span aria-hidden="true">↗</span></Link>
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/reading-list" element={<RequireAuth><ReadingListPage /></RequireAuth>} />
        <Route path="/books" element={<CatalogPage />} />
        <Route path="/books/:bookId" element={<BookDetailPage />} />
        <Route path="/authors" element={<AuthorsPage />} />
        <Route path="/authors/:authorId" element={<AuthorDetailPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/categories/:categoryId" element={<CategoryDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}
