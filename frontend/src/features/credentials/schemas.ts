import { z } from "zod";

/** Mirrors backend CredentialResponse (infrastructure/web/CredentialResponse.java). */
export const credentialResponseSchema = z.object({
  tokenId: z.number(),
  caseId: z.number(),
  holderAddress: z.string(),
  status: z.enum(["NONE", "ACTIVE", "EXPIRED", "REVOKED"]).optional(),
  issuedAtEpochSeconds: z.number().optional(),
  expiresAtEpochSeconds: z.number().optional(),
  dataVersion: z.number().optional(),
  schemaVersion: z.number().optional(),
  dataCommitment: z.string().optional(),
  revoked: z.boolean(),
  revocationReasonCode: z.string().nullable(),
  tokenUri: z.string()
});
export type CredentialResponse = z.infer<typeof credentialResponseSchema>;

export const validityResponseSchema = z.object({ valid: z.boolean() });
export type ValidityResponse = z.infer<typeof validityResponseSchema>;
