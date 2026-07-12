import { apiClient } from "../../api/client";
import { transactionOutcomeSchema, type TransactionOutcome } from "../transactions/schemas";
import {
  caseResponseSchema,
  caseSummaryListSchema,
  caseTimelineSchema,
  createCaseResponseSchema,
  submitDocumentsResponseSchema,
  type CaseEvent,
  type CaseResponse,
  type CaseStatus,
  type CaseSummary,
  type CreateCaseResponse,
  type SubmitDocumentsResponse
} from "./schemas";

export function createCase(idempotencyKey?: string): Promise<CreateCaseResponse> {
  return apiClient.post("/cases", createCaseResponseSchema, {
    ...(idempotencyKey ? { idempotencyKey } : {})
  });
}

export function getCase(caseId: number): Promise<CaseResponse> {
  return apiClient.get(`/cases/${caseId}`, caseResponseSchema);
}

export function getCaseTimeline(caseId: number): Promise<CaseEvent[]> {
  return apiClient.get(`/cases/${caseId}/timeline`, caseTimelineSchema);
}

export function submitDocuments(
  caseId: number,
  documentReference: string,
  idempotencyKey?: string
): Promise<SubmitDocumentsResponse> {
  return apiClient.post(`/cases/${caseId}/documents`, submitDocumentsResponseSchema, {
    body: { documentReference },
    ...(idempotencyKey ? { idempotencyKey } : {})
  });
}

export function resubmitDocuments(
  caseId: number,
  documentReference: string,
  idempotencyKey?: string
): Promise<SubmitDocumentsResponse> {
  return apiClient.post(`/cases/${caseId}/resubmit`, submitDocumentsResponseSchema, {
    body: { documentReference },
    ...(idempotencyKey ? { idempotencyKey } : {})
  });
}

export function claimFaucet(caseId: number, idempotencyKey?: string): Promise<TransactionOutcome> {
  return apiClient.post(`/cases/${caseId}/faucet`, transactionOutcomeSchema, {
    ...(idempotencyKey ? { idempotencyKey } : {})
  });
}

export function payFee(caseId: number, idempotencyKey?: string): Promise<TransactionOutcome> {
  return apiClient.post(`/cases/${caseId}/fee`, transactionOutcomeSchema, {
    ...(idempotencyKey ? { idempotencyKey } : {})
  });
}

/** Institutional-only inbox (see docs/evidencias/M7_FRONTEND.md for why GET /cases exists). */
export function listCases(status?: CaseStatus): Promise<CaseSummary[]> {
  const query = status ? `?status=${status}` : "";
  return apiClient.get(`/cases${query}`, caseSummaryListSchema);
}

export function requestRemediation(
  caseId: number,
  reasonCode: string,
  idempotencyKey?: string
): Promise<TransactionOutcome> {
  return apiClient.post(`/cases/${caseId}/remediation`, transactionOutcomeSchema, {
    body: { reasonCode },
    ...(idempotencyKey ? { idempotencyKey } : {})
  });
}

export function approveForeignAffairs(
  caseId: number,
  idempotencyKey?: string
): Promise<TransactionOutcome> {
  return apiClient.post(`/cases/${caseId}/foreign-affairs-approval`, transactionOutcomeSchema, {
    ...(idempotencyKey ? { idempotencyKey } : {})
  });
}

export function rejectCase(
  caseId: number,
  reasonCode: string,
  idempotencyKey?: string
): Promise<TransactionOutcome> {
  return apiClient.post(`/cases/${caseId}/reject`, transactionOutcomeSchema, {
    body: { reasonCode },
    ...(idempotencyKey ? { idempotencyKey } : {})
  });
}
