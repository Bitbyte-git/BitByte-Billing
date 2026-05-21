import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api.js';

const AuthContext = createContext(null);

const roleHome = {
  Admin: '/admin/dashboard',
  Accountant: '/accountant/dashboard',
  Client: '/client/dashboard'
};

export function AuthProvider({ children }) {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('bbt_user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    const token = localStorage.getItem('bbt_token');
    if (!token) {
      setBooting(false);
      return;
    }

    api.get('/auth/me')
      .then(({ data }) => {
        localStorage.setItem('bbt_user', JSON.stringify(data.user));
        setUser(data.user);
      })
      .catch(() => {
        localStorage.removeItem('bbt_user');
        localStorage.removeItem('bbt_token');
        setUser(null);
      })
      .finally(() => setBooting(false));
  }, []);

  const login = async ({ email, password, role }) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (role && data.user.role !== role) throw new Error(`This account belongs to the ${data.user.role} workspace.`);
    const sessionUser = data.user;
    localStorage.setItem('bbt_user', JSON.stringify(sessionUser));
    localStorage.setItem('bbt_token', data.token);
    setUser(sessionUser);
    return roleHome[sessionUser.role];
  };

  const logout = () => {
    localStorage.removeItem('bbt_user');
    localStorage.removeItem('bbt_token');
    setUser(null);
  };

  const value = useMemo(() => ({ user, booting, login, logout, roleHome }), [user, booting]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
