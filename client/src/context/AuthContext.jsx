import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from '../api/client';

const AuthContext = createContext(null);

const USER_KEY = 'rrs_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  });
  const [ready, setReady] = useState(false);

  // On mount, if we have a token but somehow no user, clear the stale token.
  useEffect(() => {
    if (getToken() && !user) {
      setToken(null);
    }
    setReady(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function persist(u, token) {
    setUser(u);
    setToken(token);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
  }

  async function login(email, password) {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    });
    persist(data.user, data.token);
    return data.user;
  }

  async function register(name, email, password) {
    const data = await api('/api/auth/register', {
      method: 'POST',
      body: { name, email, password },
      auth: false,
    });
    persist(data.user, data.token);
    return data.user;
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem(USER_KEY);
  }

  const value = useMemo(
    () => ({ user, ready, login, register, logout }),
    [user, ready]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
