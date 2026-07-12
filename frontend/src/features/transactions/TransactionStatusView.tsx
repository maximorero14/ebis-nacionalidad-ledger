import { Badge } from "../../design-system/components/Badge";
import { useTransactionReconciliation } from "./useTransactionReconciliation";
import type { TransactionStatus } from "./schemas";
import styles from "./TransactionStatusView.module.css";

export interface TransactionLike {
  transactionHash: string;
  status: TransactionStatus;
  errorCode: string | null;
  errorMessage: string | null;
}

/**
 * Minimal transaction-outcome view for M7.2 (createCase, submitDocuments, faucet, fee).
 * M7.6 ("UX de blockchain") will elevate this into the full preparando/firmando/pendiente/
 * confirmada/fallida stepper — this component and its reconciliation hook are built to be
 * reused there, not replaced.
 */
export function TransactionStatusView({ outcome }: { outcome: TransactionLike }) {
  const reconciliation = useTransactionReconciliation(outcome.transactionHash, outcome.status);
  const status = reconciliation.data?.status ?? outcome.status;
  const errorCode = reconciliation.data?.errorCode ?? outcome.errorCode;
  const errorMessage = reconciliation.data?.errorMessage ?? outcome.errorMessage;

  return (
    <div className={styles["view"]}>
      <p className={styles["hash"]}>
        Transaccion: <code>{outcome.transactionHash}</code>
      </p>
      {status === "PENDING" ? <Badge tone="info">Pendiente de confirmacion</Badge> : null}
      {status === "TIMEOUT" ? (
        <Badge tone="warning">Sin confirmacion todavia, reintentando consulta...</Badge>
      ) : null}
      {status === "CONFIRMED" ? <Badge tone="success">Confirmada</Badge> : null}
      {status === "REVERTED" ? (
        <Badge tone="danger">
          Fallida: {errorCode ?? "error"}
          {errorMessage ? ` (${errorMessage})` : ""}
        </Badge>
      ) : null}
    </div>
  );
}
