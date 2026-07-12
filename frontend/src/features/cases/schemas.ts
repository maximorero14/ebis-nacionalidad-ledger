import { z } from "zod";
import { transactionStatusSchema } from "../transactions/schemas";

/** Mirrors backend CaseStatus (domain/model/CaseStatus.java). */
export const caseStatusSchema = z.enum([
  "NONE",
  "CREATED",
  "DOCUMENTS_SUBMITTED",
  "FEE_PAID",
  "IN_REVIEW",
  "REMEDIATION_REQUIRED",
  "APPROVED",
  "REJECTED"
]);
export type CaseStatus = z.infer<typeof caseStatusSchema>;

/** Mirrors backend CaseResponse (infrastructure/web/CaseResponse.java). */
export const caseResponseSchema = z.object({
  caseId: z.number(),
  ownerAddress: z.string(),
  status: caseStatusSchema,
  reviewRound: z.number(),
  documentCommitment: z.string(),
  feePaid: z.boolean(),
  foreignAffairsApproved: z.boolean(),
  policeApproved: z.boolean(),
  credentialTokenId: z.number()
});
export type CaseResponse = z.infer<typeof caseResponseSchema>;

/** Mirrors backend CreateCaseResponse. */
export const createCaseResponseSchema = z.object({
  caseId: z.number().nullable(),
  transactionHash: z.string(),
  blockNumber: z.number().nullable(),
  status: transactionStatusSchema,
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable()
});
export type CreateCaseResponse = z.infer<typeof createCaseResponseSchema>;

/** Mirrors backend SubmitDocumentsResponse. */
export const submitDocumentsResponseSchema = z.object({
  transactionHash: z.string(),
  blockNumber: z.number().nullable(),
  status: transactionStatusSchema,
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  salt: z.string().nullable()
});
export type SubmitDocumentsResponse = z.infer<typeof submitDocumentsResponseSchema>;

/** Mirrors backend CaseEvent (domain/model/CaseEvent.java) — all data values are strings. */
export const caseEventSchema = z.object({
  eventName: z.string(),
  blockNumber: z.number(),
  transactionHash: z.string(),
  data: z.record(z.string(), z.string())
});
export type CaseEvent = z.infer<typeof caseEventSchema>;

export const caseTimelineSchema = z.array(caseEventSchema);

/**
 * Mirrors backend CaseSummaryResponse (infrastructure/web/CaseSummaryResponse.java) — the
 * GET /cases inbox for institutional roles. Backed by case_projection (M6.5), not a live
 * chain read: can lag the real on-chain state by up to the scheduler's 10s tick, and does
 * not carry foreignAffairsApproved/policeApproved (only the full CaseResponse does).
 */
export const caseSummaryResponseSchema = z.object({
  caseId: z.number(),
  ownerAddress: z.string(),
  status: caseStatusSchema,
  reviewRound: z.number(),
  updatedAt: z.string()
});
export type CaseSummary = z.infer<typeof caseSummaryResponseSchema>;

export const caseSummaryListSchema = z.array(caseSummaryResponseSchema);
