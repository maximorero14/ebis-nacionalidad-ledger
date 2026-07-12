import { z } from "zod";

/** Mirrors backend ContractsResponse (infrastructure/web/ContractsResponse.java). */
export const contractsResponseSchema = z.object({
  chainId: z.number(),
  tokenAddress: z.string(),
  credentialAddress: z.string(),
  registryAddress: z.string(),
  registryDeploymentBlock: z.number()
});
export type ContractsResponse = z.infer<typeof contractsResponseSchema>;
