/**
 * Persists "there is an in-flight transaction for this action" across a page refresh —
 * without this, refreshing mid-PENDING loses the transactionHash and the UI has no way
 * to resume reconciliation (M7.6: "funcionar correctamente tras refrescar durante una
 * transaccion pendiente"). Keyed by a caller-chosen slot (one per case+action, e.g.
 * "case-11-fee") so unrelated actions never collide. localStorage, not sessionStorage:
 * a pending tx is a property of the chain, not of this login session.
 */
const STORAGE_PREFIX = "ebis.pendingTx.";

export interface PendingTransaction {
  transactionHash: string;
  status: "PENDING" | "TIMEOUT";
}

export function getPendingTransaction(slot: string): PendingTransaction | null {
  const raw = localStorage.getItem(`${STORAGE_PREFIX}${slot}`);
  if (!raw) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      "transactionHash" in parsed &&
      "status" in parsed &&
      typeof (parsed as PendingTransaction).transactionHash === "string"
    ) {
      return parsed as PendingTransaction;
    }
    return null;
  } catch {
    return null;
  }
}

export function setPendingTransaction(slot: string, pending: PendingTransaction): void {
  localStorage.setItem(`${STORAGE_PREFIX}${slot}`, JSON.stringify(pending));
}

export function clearPendingTransaction(slot: string): void {
  localStorage.removeItem(`${STORAGE_PREFIX}${slot}`);
}
