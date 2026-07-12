import { z } from "zod";

export const walletCapabilitiesSchema = z.object({
  isRegistryAdmin: z.boolean(),
  isTokenAdmin: z.boolean(),
  isCredentialAdmin: z.boolean(),
  canReviewForeignAffairs: z.boolean(),
  canReviewPolice: z.boolean(),
  canIssueCredential: z.boolean(),
  canRevokeCredential: z.boolean(),
  canMintDemoEuro: z.boolean(),
  canManageFaucet: z.boolean(),
  canCollectFees: z.boolean()
});
export type WalletCapabilities = z.infer<typeof walletCapabilitiesSchema>;

/** Legacy role names kept for labels and old tests while auth moves to wallet capabilities. */
export const applicationRoleSchema = z.enum([
  "CITIZEN",
  "FOREIGN_AFFAIRS",
  "POLICE",
  "CREDENTIAL_ISSUER"
]);
export type ApplicationRole = z.infer<typeof applicationRoleSchema>;

export const walletNonceResponseSchema = z.object({
  nonce: z.string(),
  address: z.string(),
  chainId: z.number(),
  issuedAt: z.string(),
  expiresAt: z.string()
});
export type WalletNonceResponse = z.infer<typeof walletNonceResponseSchema>;

export const walletLoginResponseSchema = z.object({
  accessToken: z.string(),
  expiresAt: z.string(),
  address: z.string(),
  chainId: z.number(),
  capabilities: walletCapabilitiesSchema
});
export type WalletLoginResponse = z.infer<typeof walletLoginResponseSchema>;

export const meResponseSchema = z.object({
  address: z.string(),
  chainId: z.number(),
  capabilities: walletCapabilitiesSchema
});
export type MeResponse = z.infer<typeof meResponseSchema>;
