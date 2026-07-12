import { useEffect, useRef, useState } from "react";
import { useTransactionReconciliation } from "./useTransactionReconciliation";
import {
  clearPendingTransaction,
  getPendingTransaction,
  setPendingTransaction,
  type PendingTransaction
} from "./pendingTransactionStore";
import type { TransactionStatus } from "./schemas";

export type ActionPhase =
  "idle" | "preparing" | "submitting" | "pending" | "confirmed" | "reverted";

type SubmitPhase = "idle" | "preparing" | "submitting";

interface TransactionLike {
  transactionHash: string;
  blockNumber: number | null;
  status: TransactionStatus;
  errorCode: string | null;
  errorMessage: string | null;
  /** Only CreateCaseResponse and TransactionStatusResponse carry this; everything else omits it. */
  caseId?: number | null;
}

interface UseTransactionActionResult {
  phase: ActionPhase;
  transactionHash: string | undefined;
  blockNumber: number | null | undefined;
  errorCode: string | null | undefined;
  errorMessage: string | null | undefined;
  submitError: string | null;
  isTimedOut: boolean;
  retryReconciliation: () => void;
  execute: () => Promise<void>;
}

/**
 * Owns the full lifecycle of a single on-chain-backed action for M7.6: the visible
 * steps (preparando -> firmando/enviando -> pendiente -> confirmada/fallida), an
 * idempotency key reused across retries of the same attempt (never resubmits blindly),
 * and resuming reconciliation from localStorage after a refresh mid-PENDING (see
 * pendingTransactionStore.ts). `slot` must be unique per case+action (e.g.
 * "case-11-fee") so unrelated actions never share persisted state.
 *
 * "confirmada"/"fallida"/"pendiente" are derived directly from the reconciliation query
 * (not mirrored into local state) — only the pre-response steps ("preparando",
 * "firmando/enviando") are real local state, set imperatively from the execute() event
 * handler. This keeps every effect a pure side effect (persist/clear localStorage,
 * notify the caller), never a setState mirroring render data.
 */
export function useTransactionAction(
  slot: string,
  run: (idempotencyKey: string) => Promise<TransactionLike>,
  onConfirmed?: (caseId: number | null | undefined) => void
): UseTransactionActionResult {
  const [resumedPending] = useState<PendingTransaction | null>(() => getPendingTransaction(slot));
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>("idle");
  const [outcome, setOutcome] = useState<TransactionLike | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const onConfirmedRef = useRef(onConfirmed);
  useEffect(() => {
    onConfirmedRef.current = onConfirmed;
  });

  const transactionHash = outcome?.transactionHash ?? resumedPending?.transactionHash;
  const initialStatus = outcome?.status ?? resumedPending?.status;
  const reconciliation = useTransactionReconciliation(transactionHash, initialStatus);
  const latest = reconciliation.data ?? outcome;
  const latestStatus = latest?.status ?? resumedPending?.status;

  const phase: ActionPhase =
    latestStatus === "CONFIRMED"
      ? "confirmed"
      : latestStatus === "REVERTED"
        ? "reverted"
        : latestStatus === "PENDING" || latestStatus === "TIMEOUT"
          ? "pending"
          : submitPhase;

  // Pure side effects only (persist/clear localStorage, notify the caller) — never
  // setState here, so this can never trigger the cascading-render pattern React warns
  // against. Re-runs only when the terminal outcome for THIS transactionHash changes.
  useEffect(() => {
    if (!transactionHash) {
      return;
    }
    if (phase === "confirmed") {
      clearPendingTransaction(slot);
      onConfirmedRef.current?.(latest?.caseId);
    } else if (phase === "reverted") {
      clearPendingTransaction(slot);
    }
  }, [phase, transactionHash, slot, latest?.caseId]);

  async function execute() {
    setSubmitError(null);
    // Clear any previous terminal outcome (e.g. a REVERTED retry) — otherwise `phase`
    // would keep showing the stale outcome's status instead of the fresh submitPhase,
    // since a terminal status always takes priority over submitPhase in `phase` above.
    setOutcome(null);
    setSubmitPhase("preparing");
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = crypto.randomUUID();
    }
    setSubmitPhase("submitting");
    try {
      const result = await run(idempotencyKeyRef.current);
      setOutcome(result);
      if (result.status === "CONFIRMED" || result.status === "REVERTED") {
        idempotencyKeyRef.current = null;
      } else {
        setPendingTransaction(slot, {
          transactionHash: result.transactionHash,
          status: result.status
        });
      }
    } catch (error) {
      setSubmitPhase("idle");
      setSubmitError(error instanceof Error ? error.message : "No se pudo completar la accion.");
    }
  }

  return {
    phase,
    transactionHash,
    blockNumber: latest?.blockNumber,
    errorCode: latest?.errorCode,
    errorMessage: latest?.errorMessage,
    submitError,
    isTimedOut: latestStatus === "TIMEOUT",
    retryReconciliation: () => {
      void reconciliation.refetch();
    },
    execute
  };
}
