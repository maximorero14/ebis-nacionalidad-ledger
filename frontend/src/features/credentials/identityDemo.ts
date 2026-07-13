import type { CredentialResponse } from "./schemas";

const FIRST_NAMES = ["Lucia", "Mateo", "Sofia", "Leo", "Valentina", "Nicolas", "Camila"];
const LAST_NAMES = ["Garcia Vidal", "Moreno Ruiz", "Santos Vega", "Navarro Leon", "Iglesias Mora"];
const NATIONALITIES = ["ESP", "ESP", "ESP", "UE-DEMO"];

export function demoIdentity(credential: CredentialResponse) {
  const seed = credential.caseId + credential.tokenId;
  const firstName = FIRST_NAMES[seed % FIRST_NAMES.length];
  const lastName = LAST_NAMES[seed % LAST_NAMES.length];
  const birthYear = 1975 + (seed % 28);
  const birthMonth = String((seed % 12) + 1).padStart(2, "0");
  const birthDay = String((seed % 27) + 1).padStart(2, "0");
  const documentNumber = `DNI-${String(credential.tokenId).padStart(6, "0")}-${seed % 9}`;
  const fullName = `${firstName} ${lastName}`;

  return {
    fullName,
    initials: `${firstName[0]}${lastName[0]}`,
    documentNumber,
    dateOfBirth: `${birthDay}/${birthMonth}/${birthYear}`,
    nationality: NATIONALITIES[seed % NATIONALITIES.length],
    over18: true,
    mrzName: `${lastName.replaceAll(" ", "<")}<<${firstName}`.toUpperCase()
  };
}

export function statusLabel(credential: CredentialResponse, isValid: boolean | undefined) {
  if (credential.status === "EXPIRED") {
    return { label: "Caducado", tone: "danger" as const };
  }
  if (credential.revoked || credential.status === "REVOKED") {
    return { label: "Revocado", tone: "danger" as const };
  }
  if (isValid ?? credential.status === "ACTIVE") {
    return { label: "Vigente", tone: "success" as const };
  }
  return { label: "No vigente", tone: "neutral" as const };
}

export function formatEpoch(epochSeconds: number | undefined) {
  if (!epochSeconds) {
    return "Pendiente";
  }
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(epochSeconds * 1000));
}

export function shortAddress(address: string) {
  if (address.length <= 14) {
    return address;
  }
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}
