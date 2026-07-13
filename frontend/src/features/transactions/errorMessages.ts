/**
 * Translates NationalityCaseRegistry.sol / DigitalEuroDemo.sol / NationalityCredential.sol
 * custom errors (decoded server-side by CustomErrorDecoder, see docs/evidencias/
 * M7_FRONTEND.md) into actionable Spanish messages — M7.6 ("traducir reverts a mensajes
 * accionables"). Catalog confirmed against CustomErrorDecoder's decoded errorCode values;
 * unknown/future codes fall back to the raw errorCode + errorMessage rather than hiding them.
 */
const ERROR_MESSAGES: Record<string, string> = {
  Unauthorized: "Tu cuenta no tiene el rol necesario para esta accion on-chain.",
  InvalidCase: "Este expediente no existe on-chain.",
  InvalidStatus:
    "El expediente no esta en el estado necesario para esta accion. Actualiza la pagina para ver el estado real.",
  NotCaseOwner: "Esta accion solo puede realizarla el titular del expediente.",
  EmptyCommitment: "La referencia documental no puede estar vacia.",
  FeeAlreadyPaid: "La tasa de este expediente ya fue pagada.",
  DocumentsMissing: "Todavia no se presentaron documentos para este expediente.",
  ApprovalAlreadyRecorded: "Ya registraste tu aprobacion para este expediente en esta ronda.",
  StaleReviewRound:
    "El expediente avanzo de ronda mientras se procesaba esta accion. Actualiza la pagina e intenta de nuevo.",
  InvalidReasonCode: "El motivo seleccionado no es valido.",
  TerminalCase: "Este expediente ya esta en un estado final y no admite mas acciones.",
  CaseNotApproved: "El expediente todavia no esta aprobado; no se puede emitir la credencial.",
  CredentialAlreadyIssued: "Ya existe una credencial emitida para este expediente.",
  UnexpectedCredentialToken: "Error interno al vincular la credencial con el expediente.",
  ZeroAddress: "Direccion invalida (vacia).",
  ZeroAmount: "El monto no puede ser cero.",
  ExclusiveInstitutionRoles:
    "Este rol no puede combinarse con otro rol institucional en la misma cuenta.",
  ActiveCaseAlreadyExists:
    "Ya tenes un expediente activo. No podes crear otro hasta que se resuelva.",
  CitizenAlreadyApproved:
    "Esta wallet ya tiene un expediente aprobado y no puede crear un expediente nuevo.",
  FaucetDisabled: "El faucet de Euro Digital demo esta deshabilitado en este momento.",
  FaucetAlreadyClaimed:
    "Esta direccion ya reclamo el faucet anteriormente (es un beneficio unico por cuenta, no por expediente).",
  CredentialNotFound: "No existe ninguna credencial con ese identificador.",
  CredentialAlreadyRevoked: "Esta credencial ya fue revocada anteriormente.",
  SoulboundTransferBlocked: "Las credenciales de este sistema no se pueden transferir."
};

export function describeErrorCode(errorCode: string | null, errorMessage: string | null): string {
  if (errorCode && ERROR_MESSAGES[errorCode]) {
    return ERROR_MESSAGES[errorCode];
  }
  return `La transaccion se revirtio por un motivo no reconocido${errorCode ? ` (${errorCode})` : ""}${
    errorMessage ? `: ${errorMessage}` : "."
  }`;
}
