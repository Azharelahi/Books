import { createContext, useContext, useState, type ReactNode } from 'react';
import type { User } from './api';

type AuthContextValue = {
  token: string | null;
  user: User | null;
  signIn: (token: string) => void;
  signOut: () => void;
  expireSession: (redirectState: unknown) => void;
  redirectState: unknown;
};

const storageKey = 'marginalia.session';
const AuthContext = createContext<AuthContextValue | null>(null);

function getTokenUser(token: string): User | null {
  const payload = token.split('.')[1];
  if (!payload) return null;

  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder().decode(bytes)) as {
      sub?: unknown;
      email?: unknown;
      role?: unknown;
      exp?: unknown;
    };
    if (
      typeof claims.sub !== 'string' ||
      typeof claims.email !== 'string' ||
      (claims.role !== 'USER' && claims.role !== 'ADMIN') ||
      typeof claims.exp !== 'number' ||
      claims.exp * 1000 <= Date.now()
    ) return null;

    return { id: claims.sub, email: claims.email, role: claims.role };
  } catch {
    return null;
  }
}

function readSession(): { token: string; user: User } | null {
  const token = window.sessionStorage.getItem(storageKey);
  if (!token) return null;
  const user = getTokenUser(token);
  if (!user) {
    window.sessionStorage.removeItem(storageKey);
    return null;
  }
  return { token, user };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(readSession);
  const [redirectState, setRedirectState] = useState<unknown>(null);

  function signIn(token: string) {
    const user = getTokenUser(token);
    if (!user) throw new Error('The sign-in response did not contain a valid session.');
    window.sessionStorage.setItem(storageKey, token);
    setSession({ token, user });
    setRedirectState(null);
  }

  function clearSession(nextRedirectState: unknown) {
    window.sessionStorage.removeItem(storageKey);
    setSession(null);
    setRedirectState(nextRedirectState);
  }

  function signOut() {
    clearSession(null);
  }

  function expireSession(nextRedirectState: unknown) {
    clearSession(nextRedirectState);
  }

  return (
    <AuthContext.Provider value={{ token: session?.token ?? null, user: session?.user ?? null, signIn, signOut, expireSession, redirectState }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
