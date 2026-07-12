import { z } from "zod";

/** Mirrors backend TransactionStatus (domain/model/TransactionStatus.java). */
export const transactionStatusSchema = z.enum(["PENDING", "CONFIRMED", "REVERTED", "TIMEOUT"]);
export type TransactionStatus = z.infer<typeof transactionStatusSchema>;

/**
 * Mirrors the TransactionResponse shape shared by every case/credential mutation
 * (faucet, fee, remediation, approvals, reject, credential issuance, revoke).
 */
export const transactionOutcomeSchema = z.object({
  transactionHash: z.string(),
  blockNumber: z.number().nullable(),
  status: transactionStatusSchema,
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable()
});
export type TransactionOutcome = z.infer<typeof transactionOutcomeSchema>;

/** Mirrors backend TransactionStatusResponse (GET /transactions/{hash}). */
export const transactionStatusResponseSchema = z.object({
  transactionHash: z.string(),
  status: transactionStatusSchema,
  caseId: z.number().nullable(),
  blockNumber: z.number().nullable(),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  submittedAt: z.string(),
  updatedAt: z.string()
});
export type TransactionStatusResponse = z.infer<typeof transactionStatusResponseSchema>;
