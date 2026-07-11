import { z } from "zod";

/** Mirrors backend ApplicationRole (domain/model/ApplicationRole.java). */
export const applicationRoleSchema = z.enum([
  "CITIZEN",
  "FOREIGN_AFFAIRS",
  "POLICE",
  "CREDENTIAL_ISSUER"
]);
export type ApplicationRole = z.infer<typeof applicationRoleSchema>;

export const loginRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

/** Mirrors backend LoginResponse (infrastructure/web/LoginResponse.java). */
export const loginResponseSchema = z.object({
  accessToken: z.string(),
  tokenType: z.string(),
  expiresAt: z.string(),
  role: applicationRoleSchema,
  evmAddress: z.string()
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;
