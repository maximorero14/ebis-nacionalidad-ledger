import { useQuery } from "@tanstack/react-query";
import { getTransactionStatus } from "./api";
import type { TransactionStatus } from "./schemas";

/**
 * PENDING/TIMEOUT are not final states: GET /transactions/{hash} is the only supported
 * reconciliation path (see M6.4, TransactionTrackingService never resubmits blindly).
 * Polls every 2s while PENDING; stops once the backend reports CONFIRMED or REVERTED.
 * A TIMEOUT is polled once (the backend itself gave up on the receipt, not something a
 * tighter client poll will resolve faster) but the query stays enabled so a manual
 * refetch (e.g. the user revisiting the page) can pick up an eventual outcome.
 */
export function useTransactionReconciliation(
  transactionHash: string | undefined,
  initialStatus: TransactionStatus | undefined
) {
  const needsReconciliation = initialStatus === "PENDING" || initialStatus === "TIMEOUT";

  return useQuery({
    queryKey: ["transaction-status", transactionHash],
    queryFn: () => getTransactionStatus(transactionHash as string),
    enabled: Boolean(transactionHash) && needsReconciliation,
    refetchInterval: (query) => (query.state.data?.status === "PENDING" ? 2000 : false)
  });
}
