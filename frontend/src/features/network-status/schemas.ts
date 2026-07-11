import { z } from "zod";

/** Mirrors backend NetworkStatusResponse (infrastructure/web/NetworkStatusResponse.java). */
export const networkStatusSchema = z.object({
  chainId: z.number(),
  blockNumber: z.number(),
  peerCount: z.number(),
  validators: z.array(z.string()),
  gasPrice: z.number()
});
export type NetworkStatus = z.infer<typeof networkStatusSchema>;
