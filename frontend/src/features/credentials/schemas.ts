import { z } from "zod";

/** Mirrors backend CredentialResponse (infrastructure/web/CredentialResponse.java). */
export const credentialResponseSchema = z.object({
  tokenId: z.number(),
  caseId: z.number(),
  holderAddress: z.string(),
  revoked: z.boolean(),
  revocationReasonCode: z.string().nullable(),
  tokenUri: z.string()
});
export type CredentialResponse = z.infer<typeof credentialResponseSchema>;

export const validityResponseSchema = z.object({ valid: z.boolean() });
export type ValidityResponse = z.infer<typeof validityResponseSchema>;
