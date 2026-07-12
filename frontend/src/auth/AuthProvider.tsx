import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAccount, useChainId, useSignMessage } from "wagmi";
import { configureApiClient } from "../api/client";
import { requestNonce, verifyWallet } from "./api";
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
  const [isSigningIn, setIsSigningIn] = useState(false);
  const { address } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const loginWithWallet = useCallback(async () => {
    if (!address) {
      throw new Error("Conecta una wallet antes de iniciar sesion");
    }
    setIsSigningIn(true);
    try {
      const challenge = await requestNonce(address, chainId);
      const issuedAt = new Date().toISOString();
      const domain = import.meta.env["VITE_SIWE_DOMAIN"] ?? window.location.hostname;
      const uri = import.meta.env["VITE_SIWE_URI"] ?? window.location.origin;
      const message = [
        `${domain} wants you to sign in with your Ethereum account:`,
        challenge.address,
        "",
        "Firma para iniciar una sesion de API corta en ebis-nacionalidad-ledger.",
        "",
        `URI: ${uri}`,
        "Version: 1",
        `Chain ID: ${challenge.chainId}`,
        `Nonce: ${challenge.nonce}`,
        `Issued At: ${issuedAt}`,
        `Expiration Time: ${challenge.expiresAt}`
      ].join("\n");
      const signature = await signMessageAsync({ message });
      const response = await verifyWallet(message, signature);
      const newSession: Session = {
        accessToken: response.accessToken,
        address: response.address,
        chainId: response.chainId,
        capabilities: response.capabilities,
        expiresAt: response.expiresAt
      };
      saveSession(newSession);
      setSession(newSession);
    } finally {
      setIsSigningIn(false);
    }
  }, [address, chainId, signMessageAsync]);

  useEffect(() => {
    if (!session) {
      return;
    }
    if (!address || session.address.toLowerCase() !== address.toLowerCase() || session.chainId !== chainId) {
      logout();
    }
  }, [address, chainId, logout, session]);

  useEffect(() => {
    configureApiClient({
      tokenProvider: () => session?.accessToken ?? null,
      unauthorizedHandler: logout
    });
  }, [session, logout]);

  const value = useMemo(
    () => ({ session, isAuthenticated: session !== null, loginWithWallet, logout, isSigningIn }),
    [session, loginWithWallet, logout, isSigningIn]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
