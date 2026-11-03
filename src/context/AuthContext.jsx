import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('thaco_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('thaco_token'));
  const [loading, setLoading] = useState(true);

  // Validate session on boot
  useEffect(() => {
    async function checkAuth() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        setUser(res.user);
        localStorage.setItem('thaco_user', JSON.stringify(res.user));
      } catch (err) {
        console.warn('Session expired or invalid:', err.message);
        logout();
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [token]);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    localStorage.setItem('thaco_token', res.token);
    localStorage.setItem('thaco_user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('thaco_token');
    localStorage.removeItem('thaco_user');
    setToken(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    if (!token) return;
    try {
      const res = await api.get('/auth/me');
      setUser(res.user);
      localStorage.setItem('thaco_user', JSON.stringify(res.user));
    } catch (e) {
      console.error('Refresh profile error:', e);
    }
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN',
    assignedOrgs: user?.assigned_orgs || [],
    login,
    logout,
    refreshProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
