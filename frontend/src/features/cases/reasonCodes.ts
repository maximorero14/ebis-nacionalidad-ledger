/**
 * The backend hashes reasonCode with keccak256 before writing it on-chain
 * (CaseCommandService.hashReasonCode) — it is never stored or recoverable as text. Two
 * officers describing the same real-world reason with slightly different wording produce
 * two different, unrelated hashes. A fixed catalog keeps reasons comparable across cases
 * instead of silently fragmenting into one-off hashes; "otro" still allows free text for
 * whatever this catalog doesn't cover.
 */
export const REASON_CODE_CATALOG = [
  { value: "documento-ilegible", label: "Documento ilegible" },
  { value: "documento-faltante", label: "Falta un documento requerido" },
  { value: "datos-inconsistentes", label: "Datos inconsistentes entre documentos" },
  { value: "identidad-no-verificable", label: "Identidad no verificable" },
  { value: "otro", label: "Otro (especificar)" }
] as const;

export type ReasonCodeValue = (typeof REASON_CODE_CATALOG)[number]["value"];
