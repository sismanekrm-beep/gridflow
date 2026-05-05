/**
 * AuthContext - SaaS Auth Manager with Guest Mode
 *
 * GUEST MODE:
 *   - No token → isAuthenticated = false
 *   - Can use UI with limited features (3 print limit)
 *   - guestPrintCount tracked in localStorage
 *
 * ===== SUPABASE MIGRATION =====
 * Replace login/register with:
 *   supabase.auth.signInWithPassword({ email, password })
 *   supabase.auth.signUp({ email, password, options: { data: { name } } })
 *   supabase.auth.signInWithOAuth({ provider: 'google' })
 * ==============================
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);
const BACKEND_URL      = process.env.REACT_APP_BACKEND_URL || '';
const TOKEN_KEY        = 'es_auth_token';
const USER_KEY         = 'es_auth_user';
const GUEST_PRINT_KEY  = 'es_guest_prints';
const MAX_GUEST_PRINTS = 3;

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  });
  const [token, setToken]   = useState(() => localStorage.getItem(TOKEN_KEY) || null);
  const [loading, setLoading] = useState(true);
  const [guestPrints, setGuestPrints] = useState(
    () => parseInt(localStorage.getItem(GUEST_PRINT_KEY) || '0', 10)
  );

  // Set axios auth header globally
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Axios interceptor: if 401 AND we had a token → token expired, force logout
  useEffect(() => {
    const id = axios.interceptors.response.use(
      r => r,
      err => {
        if (err.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
          // Token expired
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          setToken(null); setUser(null);
          delete axios.defaults.headers.common['Authorization'];
        }
        return Promise.reject(err);
      }
    );
    return () => axios.interceptors.response.eject(id);
  }, []);

  // Verify token on mount
  useEffect(() => {
    const verify = async () => {
      if (!token) { setLoading(false); return; }
      try {
        const res = await axios.get(`${BACKEND_URL}/api/auth/me`);
        setUser(res.data);
        localStorage.setItem(USER_KEY, JSON.stringify(res.data));
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null); setUser(null);
      } finally {
        setLoading(false);
      }
    };
    verify();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveAuth = (access_token, userData) => {
    localStorage.setItem(TOKEN_KEY, access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    setToken(access_token);
    setUser(userData);
  };

  const login = useCallback(async (email, password) => {
    const res = await axios.post(`${BACKEND_URL}/api/auth/login`, { email, password });
    saveAuth(res.data.access_token, res.data.user);
    return res.data.user;
  }, []);

  const register = useCallback(async (email, password, name) => {
    const res = await axios.post(`${BACKEND_URL}/api/auth/register`, { email, password, name });
    saveAuth(res.data.access_token, res.data.user);
    // Reset guest print counter after registration
    localStorage.removeItem(GUEST_PRINT_KEY);
    setGuestPrints(0);
    return res.data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    delete axios.defaults.headers.common['Authorization'];
    setToken(null); setUser(null);
  }, []);

  const upgradeToPremium = useCallback(async () => {
    const res = await axios.post(`${BACKEND_URL}/api/auth/upgrade`);
    saveAuth(res.data.access_token, res.data.user);
    return res.data.user;
  }, []);

  const loginWithGoogle = useCallback(async (credential) => {
    const res = await axios.post(`${BACKEND_URL}/api/auth/google`, { credential });
    saveAuth(res.data.access_token, res.data.user);
    localStorage.removeItem(GUEST_PRINT_KEY);
    setGuestPrints(0);
    return res.data.user;
  }, []);

  const recordPrint = useCallback(async () => {
    const res = await axios.post(`${BACKEND_URL}/api/print/record`, { label_count: 1 });
    if (res.data.print_count !== undefined) {
      setUser(prev => {
        if (!prev) return prev;
        const updated = { ...prev, print_count: res.data.print_count };
        localStorage.setItem(USER_KEY, JSON.stringify(updated));
        return updated;
      });
    }
    return res.data;
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/auth/me`);
      setUser(res.data);
      localStorage.setItem(USER_KEY, JSON.stringify(res.data));
    } catch {}
  }, []);

  // ── Guest print tracking ─────────────────────────────────────────────
  const incrementGuestPrint = useCallback(() => {
    const next = guestPrints + 1;
    localStorage.setItem(GUEST_PRINT_KEY, String(next));
    setGuestPrints(next);
    return next;
  }, [guestPrints]);

  const canGuestPrint = guestPrints < MAX_GUEST_PRINTS;
  const guestPrintsLeft = Math.max(0, MAX_GUEST_PRINTS - guestPrints);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      isAuthenticated: !!user,
      isPremium: user?.is_premium === true,
      // Guest
      guestPrints,
      guestPrintsLeft,
      canGuestPrint,
      MAX_GUEST_PRINTS,
      incrementGuestPrint,
      // Actions
      login,
      register,
      logout,
      upgradeToPremium,
      loginWithGoogle,
      recordPrint,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
