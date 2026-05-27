import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api.js';

const AuthContext = createContext(null);

const roleHome = {
  Admin: '/admin/dashboard',
  Accountant: '/accountant/dashboard',
  Client: '/client/dashboard'
};

const MAX_SESSION_MS = 3 * 60 * 1000;

function decodeTokenExpiry(token) {
  try {
    const [, payload] = token.split('.');
    const normalized = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const decoded = JSON.parse(window.atob(normalized));
    const expiresAt = decoded.exp ? decoded.exp * 1000 : null;
    const maxAgeExpiresAt = decoded.iat ? decoded.iat * 1000 + MAX_SESSION_MS : null;

    if (expiresAt && maxAgeExpiresAt) return Math.min(expiresAt, maxAgeExpiresAt);
    return expiresAt || maxAgeExpiresAt;
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem('bbt_user');
  localStorage.removeItem('bbt_token');
}

export function AuthProvider({ children }) {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('bbt_user');
    return saved ? JSON.parse(saved) : null;
  });

  const applySession = (sessionUser, token) => {
    localStorage.setItem('bbt_user', JSON.stringify(sessionUser));
    localStorage.setItem('bbt_token', token);
    setUser(sessionUser);
  };

  useEffect(() => {
    const token = localStorage.getItem('bbt_token');
    if (!token) {
      setBooting(false);
      return;
    }

    const expiresAt = decodeTokenExpiry(token);
    if (expiresAt && expiresAt <= Date.now()) {
      clearSession();
      setUser(null);
      setBooting(false);
      return;
    }

    api.get('/auth/me')
      .then(({ data }) => {
        localStorage.setItem('bbt_user', JSON.stringify(data.user));
        setUser(data.user);
      })
      .catch(() => {
        clearSession();
        setUser(null);
      })
      .finally(() => setBooting(false));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('bbt_token');
    if (!token || !user) return undefined;

    const expiresAt = decodeTokenExpiry(token);
    if (!expiresAt) return undefined;

    const timeout = window.setTimeout(() => {
      clearSession();
      setUser(null);
    }, Math.max(expiresAt - Date.now(), 0));

    return () => window.clearTimeout(timeout);
  }, [user]);

  useEffect(() => {
    const expire = () => {
      clearSession();
      setUser(null);
    };

    window.addEventListener('bbt-session-expired', expire);
    return () => window.removeEventListener('bbt-session-expired', expire);
  }, []);

  const login = async ({ email, password }) => {
    const { data } = await api.post('/auth/login', { email, password });
    const sessionUser = data.user;
    applySession(sessionUser, data.token);
    return roleHome[sessionUser.role];
  };

  const registerClient = async (form) => {
    const { data } = await api.post('/auth/register/client', form);
    const sessionUser = data.user;
    applySession(sessionUser, data.token);
    return roleHome[sessionUser.role];
  };

  const logout = () => {
    clearSession();
    setUser(null);
  };

  const value = useMemo(() => ({ user, booting, login, registerClient, logout, roleHome }), [user, booting]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
