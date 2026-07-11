import { createContext } from "react";
import type { Session } from "./session";

export interface AuthContextValue {
  session: Session | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
