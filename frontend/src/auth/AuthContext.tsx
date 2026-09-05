import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";
import { authApi } from "../api/resources";
import { tokenStore } from "../api/client";
import type { DecodedToken } from "../types";

interface AuthUser {
  id: string;
  organizationId: string;
  role: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function decode(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as DecodedToken;
    return { id: payload.sub, organizationId: payload.org, role: payload.role, email: payload.email };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const token = tokenStore.getAccess();
    return token ? decode(token) : null;
  });

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await authApi.login(email, password);
    tokenStore.set(data.access, data.refresh);
    setUser(decode(data.access));
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, login, logout }),
    [user, login, logout],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
