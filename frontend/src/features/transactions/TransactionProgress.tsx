import { Badge } from "../../design-system/components/Badge";
import { Button } from "../../design-system/components/Button";
import { describeErrorCode } from "./errorMessages";
import type { ActionPhase } from "./useTransactionAction";
import styles from "./TransactionProgress.module.css";

interface TransactionProgressProps {
  phase: ActionPhase;
  transactionHash: string | undefined;
  blockNumber: number | null | undefined;
  errorCode: string | null | undefined;
  errorMessage: string | null | undefined;
  submitError: string | null | undefined;
  isTimedOut: boolean | undefined;
  onRetryReconciliation: (() => void) | undefined;
}

const STEPS: Array<{ phase: ActionPhase; label: string }> = [
  { phase: "preparing", label: "Preparando" },
  { phase: "submitting", label: "Firmando y enviando" },
  { phase: "pending", label: "Pendiente" },
  { phase: "confirmed", label: "Confirmada" }
];

const ORDER: ActionPhase[] = ["preparing", "submitting", "pending", "confirmed"];

function stepState(
  stepPhase: ActionPhase,
  currentPhase: ActionPhase
): "done" | "current" | "upcoming" {
  if (currentPhase === "reverted") {
    return stepPhase === "preparing" || stepPhase === "submitting" ? "done" : "upcoming";
  }
  const currentIndex = ORDER.indexOf(currentPhase);
  const stepIndex = ORDER.indexOf(stepPhase);
  if (currentIndex === -1 || stepIndex === -1) {
    return "upcoming";
  }
  if (stepIndex < currentIndex) {
    return "done";
  }
  return stepIndex === currentIndex ? "current" : "upcoming";
}

/**
 * The M7.6 stepper: preparando -> firmando/enviando -> pendiente -> confirmada/fallida.
 * There is no client-side wallet in this demo (the backend signs and broadcasts, see
 * M6.3/DemoActorCredentials), so "firmando y enviando" covers the whole synchronous
 * backend wait (up to 30s, M6.4), not a wallet popup.
 */
export function TransactionProgress({
  phase,
  transactionHash,
  blockNumber,
  errorCode,
  errorMessage,
  submitError,
  isTimedOut,
  onRetryReconciliation
}: TransactionProgressProps) {
  if (phase === "idle" && !submitError) {
    return null;
  }

  return (
    <div className={styles["progress"]}>
      {submitError ? <p role="alert">{submitError}</p> : null}

      {phase !== "idle" ? (
        <ol className={styles["steps"]}>
          {STEPS.map((step) => (
            <li
              key={step.phase}
              className={`${styles["step"]} ${styles[stepState(step.phase, phase)]}`}
            >
              {step.label}
            </li>
          ))}
          {phase === "reverted" ? (
            <li className={`${styles["step"]} ${styles["failed"]}`}>Fallida</li>
          ) : null}
        </ol>
      ) : null}

      {transactionHash ? (
        <p className={styles["hash"]}>
          Transaccion: <code>{transactionHash}</code>
          {blockNumber ? ` · bloque ${blockNumber}` : ""}
        </p>
      ) : null}

      {isTimedOut && phase === "pending" ? (
        <div className={styles["timeout"]}>
          <Badge tone="warning">Sin confirmacion todavia</Badge>
          <p className={styles["hint"]}>
            El backend no recibio el recibo dentro de su ventana de espera (M6.4); el estado de la
            cadena sigue siendo incierto, no fallido. Podes volver a consultar por el mismo hash
            cuando quieras.
          </p>
          {onRetryReconciliation ? (
            <Button variant="secondary" onClick={onRetryReconciliation}>
              Consultar de nuevo
            </Button>
          ) : null}
        </div>
      ) : null}

      {phase === "reverted" ? (
        <Badge tone="danger">{describeErrorCode(errorCode ?? null, errorMessage ?? null)}</Badge>
      ) : null}
    </div>
  );
}
