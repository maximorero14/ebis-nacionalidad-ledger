import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "../../design-system/components/Card";
import { Button } from "../../design-system/components/Button";
import { TransactionProgress } from "../../features/transactions/TransactionProgress";
import { CredentialCard } from "../../features/credentials/CredentialCard";
import { isApiError } from "../../api/errors";
import { getCase, getCaseTimeline } from "../../features/cases/api";
import { useIssueCredentialWithWallet } from "../../features/cases/useCaseWalletActions";
import { CaseSummaryPanel } from "./CaseSummaryPanel";
import { CaseTimeline } from "./CaseTimeline";
import styles from "./CredentialIssuerCaseDetailPage.module.css";

const IN_FLIGHT_PHASES = new Set(["preparing", "submitting", "pending", "confirmed"]);

export function CredentialIssuerCaseDetailPage() {
  const { caseId: caseIdParam } = useParams<{ caseId: string }>();
  const caseId = Number(caseIdParam);
  const isValidCaseId = Number.isInteger(caseId) && caseId > 0;
  const queryClient = useQueryClient();

  const caseQuery = useQuery({
    queryKey: ["case", caseId],
    queryFn: () => getCase(caseId),
    enabled: isValidCaseId
  });
  const timelineQuery = useQuery({
    queryKey: ["case-timeline", caseId],
    queryFn: () => getCaseTimeline(caseId),
    enabled: isValidCaseId
  });

  function refreshCase() {
    void queryClient.invalidateQueries({ queryKey: ["case", caseId] });
    void queryClient.invalidateQueries({ queryKey: ["case-timeline", caseId] });
    void queryClient.invalidateQueries({ queryKey: ["case-list"] });
  }

  const issueAction = useIssueCredentialWithWallet(caseId, refreshCase);

  if (!isValidCaseId) {
    return (
      <Card>
        <p>Numero de expediente invalido.</p>
      </Card>
    );
  }

  if (caseQuery.isPending) {
    return (
      <Card>
        <p>Consultando expediente...</p>
      </Card>
    );
  }

  if (caseQuery.isError || !caseQuery.data) {
    const error = caseQuery.error;
    const message =
      isApiError(error) && error.status === 404
        ? `El expediente #${caseId} no existe.`
        : `No se pudo consultar el expediente #${caseId}.`;
    return (
      <Card>
        <p>{message}</p>
      </Card>
    );
  }

  const caseData = caseQuery.data;
  const hasCredential = caseData.credentialTokenId > 0;
  const canIssue = caseData.status === "APPROVED" && !hasCredential;

  return (
    <div className={styles["page"]}>
      <Card>
        <CaseSummaryPanel caseData={caseData} showFee={false} showOwner />
      </Card>

      <Card>
        <h2>Emision de credencial</h2>
        {!canIssue && !hasCredential ? (
          <p className={styles["hint"]}>
            Este expediente no esta aprobado todavia; la emision no aplica en este estado.
          </p>
        ) : null}
        {hasCredential ? (
          <>
            <p className={styles["hint"]}>La credencial ya fue emitida para este expediente.</p>
            <CredentialCard tokenId={caseData.credentialTokenId} />
          </>
        ) : (
          <>
            <Button
              disabled={!canIssue || IN_FLIGHT_PHASES.has(issueAction.phase)}
              onClick={() => {
                void issueAction.execute();
              }}
            >
              Emitir credencial
            </Button>
            <TransactionProgress
              phase={issueAction.phase}
              transactionHash={issueAction.transactionHash}
              blockNumber={issueAction.blockNumber}
              errorCode={issueAction.errorCode}
              errorMessage={issueAction.errorMessage}
              submitError={issueAction.submitError}
              isTimedOut={issueAction.isTimedOut}
              onRetryReconciliation={issueAction.retryReconciliation}
            />
          </>
        )}
      </Card>

      <Card>
        {timelineQuery.isPending ? <p>Consultando timeline...</p> : null}
        {timelineQuery.data ? <CaseTimeline events={timelineQuery.data} /> : null}
      </Card>
    </div>
  );
}
