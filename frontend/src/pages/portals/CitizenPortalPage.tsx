import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { Card } from "../../design-system/components/Card";
import { Button } from "../../design-system/components/Button";
import { Badge } from "../../design-system/components/Badge";
import { TextField } from "../../design-system/components/TextField";
import { TransactionProgress } from "../../features/transactions/TransactionProgress";
import { useTransactionAction } from "../../features/transactions/useTransactionAction";
import { EuroBalanceWidget } from "../../features/euro-balance/EuroBalanceWidget";
import { addKnownCaseId, getKnownCaseIds } from "../../features/cases/knownCases";
import { useCasesSummary } from "../../features/cases/useCasesSummary";
import { createCase } from "../../features/cases/api";
import { CASE_STATUS_LABEL, CASE_STATUS_TONE } from "../../features/cases/caseLabels";
import styles from "./CitizenPortalPage.module.css";

export function CitizenPortalPage() {
  const { session } = useAuth();
  const evmAddress = session?.evmAddress ?? "";
  const [knownCaseIds, setKnownCaseIds] = useState<number[]>(() =>
    evmAddress ? getKnownCaseIds(evmAddress) : []
  );
  const [manualCaseId, setManualCaseId] = useState("");

  const summaries = useCasesSummary(knownCaseIds);

  function rememberCaseId(caseId: number) {
    addKnownCaseId(evmAddress, caseId);
    setKnownCaseIds((current) => (current.includes(caseId) ? current : [...current, caseId]));
  }

  const createCaseAction = useTransactionAction(
    `citizen-${evmAddress}-create-case`,
    (idempotencyKey) => createCase(idempotencyKey),
    (caseId) => {
      if (caseId !== null && caseId !== undefined) {
        rememberCaseId(caseId);
      }
    }
  );

  function handleAddManualCaseId(event: FormEvent) {
    event.preventDefault();
    const parsed = Number(manualCaseId);
    if (Number.isInteger(parsed) && parsed > 0) {
      rememberCaseId(parsed);
      setManualCaseId("");
    }
  }

  return (
    <div className={styles["page"]}>
      <Card>
        <h1>Portal ciudadano</h1>
        {session ? (
          <p>
            Sesion activa: <strong>{session.role}</strong> (<code>{session.evmAddress}</code>)
          </p>
        ) : null}
        <EuroBalanceWidget evmAddress={evmAddress} />
      </Card>

      <Card>
        <h2>Mis expedientes</h2>
        <p className={styles["hint"]}>
          El backend no expone un listado de expedientes por titular: este panel recuerda, en este
          navegador, los expedientes que ya conoces. Si abris el portal desde otro dispositivo,
          agrega el numero de expediente manualmente.
        </p>
        {knownCaseIds.length === 0 ? <p>Todavia no tenes expedientes registrados aqui.</p> : null}
        <ul className={styles["list"]}>
          {knownCaseIds.map((caseId, index) => {
            const summary = summaries[index];
            return (
              <li key={caseId} className={styles["listItem"]}>
                <Link to={`/ciudadano/expedientes/${caseId}`} className={styles["caseLink"]}>
                  Expediente #{caseId}
                </Link>
                {summary?.data ? (
                  <Badge tone={CASE_STATUS_TONE[summary.data.status]}>
                    {CASE_STATUS_LABEL[summary.data.status]}
                  </Badge>
                ) : summary?.isPending ? (
                  <Badge tone="neutral">Consultando...</Badge>
                ) : (
                  <Badge tone="danger">No disponible</Badge>
                )}
              </li>
            );
          })}
        </ul>
        <form className={styles["addForm"]} onSubmit={handleAddManualCaseId}>
          <TextField
            label="Agregar expediente por numero"
            value={manualCaseId}
            onChange={(event) => setManualCaseId(event.target.value)}
            inputMode="numeric"
          />
          <Button type="submit" variant="secondary">
            Agregar
          </Button>
        </form>
      </Card>

      <Card>
        <h2>Crear expediente</h2>
        <Button
          onClick={() => {
            void createCaseAction.execute();
          }}
          disabled={createCaseAction.phase !== "idle" && createCaseAction.phase !== "reverted"}
        >
          Crear nuevo expediente
        </Button>
        <TransactionProgress
          phase={createCaseAction.phase}
          transactionHash={createCaseAction.transactionHash}
          blockNumber={createCaseAction.blockNumber}
          errorCode={createCaseAction.errorCode}
          errorMessage={createCaseAction.errorMessage}
          submitError={createCaseAction.submitError}
          isTimedOut={createCaseAction.isTimedOut}
          onRetryReconciliation={createCaseAction.retryReconciliation}
        />
      </Card>
    </div>
  );
}
