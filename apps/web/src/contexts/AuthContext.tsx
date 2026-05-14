"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface User {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  created_at: string;
  plan: string;
  plan_label: string;
  plan_limit: number;
  reviews_used_this_period: number;
  reviews_remaining: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  /** Returns auth headers for API calls */
  authHeaders: () => Record<string, string>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("legal_agent_token");
    if (savedToken) {
      setToken(savedToken);
      // Verify token is still valid by fetching /auth/me
      fetch(`${API_BASE}/auth/me`, {
        headers: {
          Authorization: `Bearer ${savedToken}`,
          "Content-Type": "application/json",
        },
      })
        .then((res) => {
          if (res.ok) return res.json();
          // Token invalid — clear it
          localStorage.removeItem("legal_agent_token");
          setToken(null);
          throw new Error("Token expired");
        })
        .then((data: User) => setUser(data))
        .catch(() => {
          // already handled above
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const authHeaders = useCallback((): Record<string, string> => {
    const t = token || localStorage.getItem("legal_agent_token");
    if (t) {
      return {
        Authorization: `Bearer ${t}`,
        "Content-Type": "application/json",
      };
    }
    return { "Content-Type": "application/json" };
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Error al iniciar sesión");
    }
    const data = await res.json();
    localStorage.setItem("legal_agent_token", data.access_token);
    setToken(data.access_token);

    // Fetch user profile
    const meRes = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        Authorization: `Bearer ${data.access_token}`,
        "Content-Type": "application/json",
      },
    });
    if (meRes.ok) {
      const me = await meRes.json();
      setUser(me);
    }
  }, []);

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Error al registrarse");
      }
      const data = await res.json();
      localStorage.setItem("legal_agent_token", data.access_token);
      setToken(data.access_token);

      // Fetch user profile
      const meRes = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          Authorization: `Bearer ${data.access_token}`,
          "Content-Type": "application/json",
        },
      });
      if (meRes.ok) {
        const me = await meRes.json();
        setUser(me);
      }
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem("legal_agent_token");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout, authHeaders }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
