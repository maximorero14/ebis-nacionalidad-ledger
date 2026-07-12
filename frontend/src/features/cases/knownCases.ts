const STORAGE_PREFIX = "ebis.knownCases.";

/**
 * There is no `GET /cases` (list by owner) in the backend — confirmed while building
 * M7.2, see docs/evidencias/M7_FRONTEND.md. The citizen dashboard can only show
 * expedientes it already knows the id of, so it tracks known ids per address here in
 * localStorage (survives across sessions, unlike the JWT in sessionStorage) as a
 * client-side convenience only — the chain/backend remain the source of truth for every
 * case's actual state, this is purely "which ids should I ask about".
 */
function storageKey(evmAddress: string): string {
  return `${STORAGE_PREFIX}${evmAddress.toLowerCase()}`;
}

export function getKnownCaseIds(evmAddress: string): number[] {
  const raw = localStorage.getItem(storageKey(evmAddress));
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === "number") : [];
  } catch {
    return [];
  }
}

export function addKnownCaseId(evmAddress: string, caseId: number): void {
  const existing = getKnownCaseIds(evmAddress);
  if (existing.includes(caseId)) {
    return;
  }
  localStorage.setItem(storageKey(evmAddress), JSON.stringify([...existing, caseId]));
}
