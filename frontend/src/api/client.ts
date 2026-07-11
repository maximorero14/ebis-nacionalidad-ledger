import type { ZodType } from "zod";
import { ApiError } from "./errors";

const BASE_URL = import.meta.env["VITE_API_BASE_URL"] ?? "http://localhost:8080";

type TokenProvider = () => string | null;
type UnauthorizedHandler = () => void;

let getToken: TokenProvider = () => null;
let onUnauthorized: UnauthorizedHandler = () => {};

/** Wired once by AuthProvider — keeps api/client.ts free of a circular import on auth/. */
export function configureApiClient(options: {
  tokenProvider: TokenProvider;
  unauthorizedHandler: UnauthorizedHandler;
}): void {
  getToken = options.tokenProvider;
  onUnauthorized = options.unauthorizedHandler;
}

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  idempotencyKey?: string;
  auth?: boolean;
}

async function request<T>(
  path: string,
  schema: ZodType<T>,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, idempotencyKey, auth = true } = options;

  const headers = new Headers({ Accept: "application/json" });
  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (idempotencyKey) {
    headers.set("Idempotency-Key", idempotencyKey);
  }
  if (auth) {
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });

  const correlationId = response.headers.get("X-Correlation-Id") ?? undefined;

  if (!response.ok) {
    if (response.status === 401) {
      onUnauthorized();
    }
    const message = await extractErrorMessage(response);
    throw new ApiError(message, response.status, correlationId);
  }

  if (response.status === 204) {
    return schema.parse(undefined);
  }

  const json: unknown = await response.json();
  return schema.parse(json);
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object" && "message" in body && typeof body.message === "string") {
      return body.message;
    }
  } catch {
    // response body was not JSON (or empty) — fall through to the generic message
  }
  return `Request failed with status ${response.status}`;
}

export const apiClient = {
  get: <T>(path: string, schema: ZodType<T>, options?: Omit<RequestOptions, "method" | "body">) =>
    request(path, schema, { ...options, method: "GET" }),
  post: <T>(path: string, schema: ZodType<T>, options?: Omit<RequestOptions, "method">) =>
    request(path, schema, { ...options, method: "POST" })
};
