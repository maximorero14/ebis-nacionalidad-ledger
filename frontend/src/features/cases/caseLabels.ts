import type { BadgeTone } from "../../design-system/components/Badge";
import type { CaseEvent, CaseStatus } from "./schemas";

export const CASE_STATUS_LABEL: Record<CaseStatus, string> = {
  NONE: "Sin expediente",
  CREATED: "Creado",
  DOCUMENTS_SUBMITTED: "Documentos presentados",
  FEE_PAID: "Tasa pagada",
  IN_REVIEW: "En revision",
  REMEDIATION_REQUIRED: "Requiere subsanacion",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado"
};

export const CASE_STATUS_TONE: Record<CaseStatus, BadgeTone> = {
  NONE: "neutral",
  CREATED: "info",
  DOCUMENTS_SUBMITTED: "info",
  FEE_PAID: "info",
  IN_REVIEW: "info",
  REMEDIATION_REQUIRED: "warning",
  APPROVED: "success",
  REJECTED: "danger"
};

/** DigitalEuroDemo.decimals() is fixed at 2 (see contracts/DigitalEuroDemo.sol) — event amounts arrive as raw integer strings. */
function formatEuroAmount(rawAmount: string | undefined): string {
  if (rawAmount === undefined) {
    return "?";
  }
  const parsed = Number(rawAmount);
  return Number.isFinite(parsed) ? `${(parsed / 100).toFixed(2)} EURD` : rawAmount;
}

/**
 * reasonCode arrives as a keccak256 hash (see CaseCommandService.hashReasonCode) — it is
 * a one-way hash of a string only the institutional actor who wrote it knows, so it is
 * shown as-is with an explanation rather than pretended to be decodable.
 */
export function describeCaseEvent(event: CaseEvent): string {
  const { eventName, data } = event;
  switch (eventName) {
    case "CaseCreated":
      return "Expediente creado";
    case "DocumentsSubmitted":
      return `Documentos presentados (ronda ${data["round"] ?? "?"})`;
    case "FeePaid":
      return `Tasa pagada (${formatEuroAmount(data["amount"])})`;
    case "CaseEnteredReview":
      return `Expediente en revision (ronda ${data["round"] ?? "?"})`;
    case "RemediationRequested":
      return `Subsanacion solicitada para la ronda ${data["nextRound"] ?? "?"} — codigo de motivo (hash, no reversible): ${data["reasonCode"] ?? "?"}`;
    case "ForeignAffairsApproved":
      return `Aprobacion de Extranjeria (ronda ${data["round"] ?? "?"})`;
    case "PoliceApproved":
      return `Aprobacion de Policia (ronda ${data["round"] ?? "?"})`;
    case "CaseApproved":
      return `Expediente aprobado (ronda ${data["round"] ?? "?"})`;
    case "CaseRejected":
      return `Expediente rechazado — codigo de motivo (hash, no reversible): ${data["reasonCode"] ?? "?"}`;
    case "CredentialIssued":
      return `Credencial emitida (token #${data["tokenId"] ?? "?"})`;
    default:
      return eventName;
  }
}
