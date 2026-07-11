import { apiClient } from "../api/client";
import { loginResponseSchema, type LoginRequest, type LoginResponse } from "./schemas";

export function login(credentials: LoginRequest): Promise<LoginResponse> {
  return apiClient.post("/auth/login", loginResponseSchema, {
    body: credentials,
    auth: false
  });
}
