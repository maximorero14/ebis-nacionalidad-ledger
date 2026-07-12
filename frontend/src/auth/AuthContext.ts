import { createContext } from "react";
import type { Session } from "./session";

export interface AuthContextValue {
  session: Session | null;
  isAuthenticated: boolean;
  loginWithWallet: () => Promise<void>;
  logout: () => void;
  isSigningIn: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
