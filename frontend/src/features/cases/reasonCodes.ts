/**
 * Closed catalogs, not free text — this mirrors docs/FUNCIONAL.md ("Politicas de codigos
 * no sensibles"): reasonCode is hashed with keccak256 before going on-chain
 * (CaseCommandService.hashReasonCode), so a free-text field would let an officer type
 * anything (a name, a date, a real detail) into something that becomes a permanent,
 * un-erasable on-chain commitment — exactly what INV-011/T-005 (no PII on-chain) forbid.
 * The frontend is currently the only layer enforcing this closed set (the backend only
 * checks @NotBlank), so it must not offer an escape hatch.
 */
export const REMEDIATION_REASON_CODES = [
  { value: "MISSING_DEMO_DOCUMENT", label: "Falta un documento requerido" },
  { value: "INVALID_DEMO_FORMAT", label: "Formato de documento invalido" },
  { value: "INCONSISTENT_DEMO_REFERENCE", label: "Referencia documental inconsistente" }
] as const;

export const REJECTION_REASON_CODES = [
  { value: "DEMO_REQUIREMENTS_NOT_MET", label: "No cumple los requisitos de la demo" },
  { value: "FAILED_ADMIN_VALIDATION", label: "Fallo la validacion administrativa" },
  { value: "FAILED_POLICE_VALIDATION", label: "Fallo la validacion policial" },
  { value: "EXPIRED_DEMO_PROCESS", label: "El proceso demo vencio" }
] as const;

export interface ReasonCodeOption {
  value: string;
  label: string;
}
