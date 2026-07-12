import type { CaseResponse } from "./schemas";

/**
 * Derived client-side from CaseResponse — the backend has no `allowedActions` field, so
 * this replicates NationalityCaseRegistry.sol's preconditions (InvalidStatus/
 * ApprovalAlreadyRecorded) to disable invalid actions before they ever reach the chain.
 * A disabled button is a UX nicety, not a security boundary: the contract enforces the
 * same rules again regardless of what the frontend allows.
 */
export function canActOnReview(caseData: Pick<CaseResponse, "status">): boolean {
  return caseData.status === "IN_REVIEW";
}

export function canForeignAffairsApprove(
  caseData: Pick<CaseResponse, "status" | "foreignAffairsApproved">
): boolean {
  return caseData.status === "IN_REVIEW" && !caseData.foreignAffairsApproved;
}

export function canPoliceApprove(
  caseData: Pick<CaseResponse, "status" | "policeApproved">
): boolean {
  return caseData.status === "IN_REVIEW" && !caseData.policeApproved;
}
