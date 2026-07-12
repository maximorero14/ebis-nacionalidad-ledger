import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { Card } from "../../design-system/components/Card";
import { Button } from "../../design-system/components/Button";
import { Badge } from "../../design-system/components/Badge";
import { TransactionProgress } from "../../features/transactions/TransactionProgress";
import { EuroBalanceWidget } from "../../features/euro-balance/EuroBalanceWidget";
import { useCasesSummary } from "../../features/cases/useCasesSummary";
import { MY_CASES_QUERY_KEY, useMyCases } from "../../features/cases/useMyCases";
import { useCreateCaseWithWallet } from "../../features/cases/useCaseWalletActions";
import { CASE_STATUS_LABEL, CASE_STATUS_TONE } from "../../features/cases/caseLabels";
import styles from "./CitizenPortalPage.module.css";

export function CitizenPortalPage() {
  const { session } = useAuth();
  const evmAddress = session?.address ?? "";
  const queryClient = useQueryClient();
  const myCases = useMyCases();
  const [recentCaseIds, setRecentCaseIds] = useState<number[]>([]);

  const projectedCaseIds = useMemo(
    () => new Set((myCases.data ?? []).map((caseSummary) => caseSummary.caseId)),
    [myCases.data]
  );
  const recentMissingProjectionIds = recentCaseIds.filter(
    (caseId) => !projectedCaseIds.has(caseId)
  );
  const recentSummaries = useCasesSummary(recentMissingProjectionIds);

  const createCaseAction = useCreateCaseWithWallet((caseId) => {
    if (caseId !== null && caseId !== undefined) {
      setRecentCaseIds((current) => (current.includes(caseId) ? current : [...current, caseId]));
      void queryClient.invalidateQueries({ queryKey: MY_CASES_QUERY_KEY });
    }
  });

  const automaticCases = myCases.data ?? [];

  return (
    <div className={styles["page"]}>
      <Card className={styles["hero"]}>
        <div>
          <p className={styles["eyebrow"]}>Tramite ciudadano</p>
          <h1>Portal ciudadano</h1>
          {session ? (
            <p>
              Sesion activa: <code>{session.address}</code>
            </p>
          ) : null}
        </div>
        <EuroBalanceWidget evmAddress={evmAddress} />
      </Card>

      <Card>
        <h2>Mis expedientes</h2>
        <p className={styles["hint"]}>
          Estos expedientes pertenecen a la wallet ciudadana con la que firmaste la sesion.
        </p>
        {myCases.isPending ? <p>Consultando tus expedientes...</p> : null}
        {!myCases.isPending &&
        automaticCases.length === 0 &&
        recentMissingProjectionIds.length === 0 ? (
          <p>Todavia no tenes expedientes registrados aqui.</p>
        ) : null}
        {myCases.isError ? (
          <p role="alert">
            No se pudieron consultar tus expedientes. Proba firmar sesion otra vez.
          </p>
        ) : null}
        <ul className={styles["list"]}>
          {automaticCases.map((caseSummary) => (
            <li key={caseSummary.caseId} className={styles["listItem"]}>
              <Link
                to={`/ciudadano/expedientes/${caseSummary.caseId}`}
                className={styles["caseLink"]}
              >
                Expediente #{caseSummary.caseId}
              </Link>
              <Badge tone={CASE_STATUS_TONE[caseSummary.status]}>
                {CASE_STATUS_LABEL[caseSummary.status]}
              </Badge>
            </li>
          ))}
          {recentMissingProjectionIds.map((caseId, index) => {
            const summary = recentSummaries[index];
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
