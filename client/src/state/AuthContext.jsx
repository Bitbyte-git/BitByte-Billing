import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authAPI } from '../api.js';

const AuthContext = createContext(null);

const roleHome = {
  Admin: '/admin/dashboard',
  Accountant: '/accountant/dashboard',
  Client: '/client/dashboard'
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('bbt_token');
    if (token) {
      authAPI.me()
        .then(res => {
          if (res.user) {
            setUser(res.user);
          } else {
            localStorage.removeItem('bbt_token');
          }
        })
        .catch(() => {
          localStorage.removeItem('bbt_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async ({ email, password, role }) => {
    const res = await authAPI.login({ email, password });
    if (res.user.role !== role) {
      throw new Error(`Invalid credentials or role mismatch.`);
    }
    localStorage.setItem('bbt_token', res.token);
    setUser(res.user);
    return roleHome[res.user.role];
  };

  const registerClient = async (data) => {
    const res = await authAPI.registerClient(data);
    localStorage.setItem('bbt_token', res.token);
    setUser(res.user);
    return roleHome['Client'];
  };

  const logout = () => {
    authAPI.logout().catch(() => {}); // Optional call to backend
    localStorage.removeItem('bbt_token');
    setUser(null);
  };

  const value = useMemo(() => ({ user, login, registerClient, logout, roleHome, loading }), [user, loading]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-navy text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple border-t-transparent"></div>
          <p className="font-semibold text-slate-300">Loading session...</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
