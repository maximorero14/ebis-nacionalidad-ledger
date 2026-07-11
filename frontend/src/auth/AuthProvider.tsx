import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { configureApiClient } from "../api/client";
import { login as loginRequest } from "./api";
import { AuthContext } from "./AuthContext";
import { clearSession, isExpired, loadSession, saveSession, type Session } from "./session";

function readValidSession(): Session | null {
  const existing = loadSession();
  if (!existing) {
    return null;
  }
  if (isExpired(existing)) {
    clearSession();
    return null;
  }
  return existing;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readValidSession);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const response = await loginRequest({ username, password });
    const newSession: Session = {
      accessToken: response.accessToken,
      role: response.role,
      evmAddress: response.evmAddress,
      expiresAt: response.expiresAt
    };
    saveSession(newSession);
    setSession(newSession);
  }, []);

  useEffect(() => {
    configureApiClient({
      tokenProvider: () => session?.accessToken ?? null,
      unauthorizedHandler: logout
    });
  }, [session, logout]);

  const value = useMemo(
    () => ({ session, isAuthenticated: session !== null, login, logout }),
    [session, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
