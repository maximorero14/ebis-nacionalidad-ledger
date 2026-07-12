import { apiClient } from "../api/client";
import {
  meResponseSchema,
  walletLoginResponseSchema,
  walletNonceResponseSchema,
  type MeResponse,
  type WalletLoginResponse,
  type WalletNonceResponse
} from "./schemas";

export function requestNonce(address: string, chainId: number): Promise<WalletNonceResponse> {
  return apiClient.post("/auth/nonce", walletNonceResponseSchema, {
    auth: false,
    body: { address, chainId }
  });
}

export function verifyWallet(message: string, signature: string): Promise<WalletLoginResponse> {
  return apiClient.post("/auth/verify", walletLoginResponseSchema, {
    auth: false,
    body: { message, signature }
  });
}

export function getMe(): Promise<MeResponse> {
  return apiClient.get("/auth/me", meResponseSchema);
}
