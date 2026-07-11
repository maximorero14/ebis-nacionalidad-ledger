import type { ApplicationRole } from "./schemas";

const STORAGE_KEY = "ebis.session";

export interface Session {
  accessToken: string;
  role: ApplicationRole;
  evmAddress: string;
  expiresAt: string;
}

/**
 * sessionStorage (not localStorage): the demo JWT is short-lived (15 min, see
 * AuthenticationService) and scoping it to the tab lifetime is a reasonable default for
 * a demo — never persisted longer than the browser session.
 */
export function loadSession(): Session | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function isExpired(session: Session): boolean {
  return new Date(session.expiresAt).getTime() <= Date.now();
}
