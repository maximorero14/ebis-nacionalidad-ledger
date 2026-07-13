import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "../../design-system/components/Card";
import { Badge } from "../../design-system/components/Badge";
import { Button } from "../../design-system/components/Button";
import { TransactionProgress } from "../../features/transactions/TransactionProgress";
import { DigitalIdentityCredentialCard } from "../../features/credentials/DigitalIdentityCard";
import { ReasonCodeField } from "../../features/cases/ReasonCodeField";
import { REJECTION_REASON_CODES, REMEDIATION_REASON_CODES } from "../../features/cases/reasonCodes";
import { isApiError } from "../../api/errors";
import { getCase, getCaseTimeline } from "../../features/cases/api";
import {
  useApprovePoliceWithWallet,
  useRejectCaseWithWallet,
  useRequestRemediationWithWallet
} from "../../features/cases/useCaseWalletActions";
import { CASE_STATUS_LABEL } from "../../features/cases/caseLabels";
import { canActOnReview, canPoliceApprove } from "../../features/cases/caseTransitions";
import { CaseSummaryPanel } from "./CaseSummaryPanel";
import { CaseTimeline } from "./CaseTimeline";
import styles from "./PoliceCaseDetailPage.module.css";

const IN_FLIGHT_PHASES = new Set(["preparing", "submitting", "pending", "confirmed"]);

export function PoliceCaseDetailPage() {
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

  // Demo-only UI gate, not chain state: NationalityCaseRegistry.sol has no
  // background-check field. It reflects the functional police review step without
  // pretending an external system was integrated; resetting the page loses it on purpose.
  const [backgroundCheckDone, setBackgroundCheckDone] = useState(false);

  const [remediationReason, setRemediationReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  function refreshCase() {
    void queryClient.invalidateQueries({ queryKey: ["case", caseId] });
    void queryClient.invalidateQueries({ queryKey: ["case-timeline", caseId] });
    void queryClient.invalidateQueries({ queryKey: ["case-list"] });
  }

  const reviewRound = caseQuery.data?.reviewRound ?? 0;
  const remediationAction = useRequestRemediationWithWallet(caseId, remediationReason, refreshCase);
  const approveAction = useApprovePoliceWithWallet(caseId, reviewRound, refreshCase);
  const rejectAction = useRejectCaseWithWallet(caseId, rejectReason, refreshCase);

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
  const canAct = canActOnReview(caseData);
  const canApproveOnChain = canPoliceApprove(caseData);
  const canApprove = canApproveOnChain && backgroundCheckDone;

  return (
    <div className={styles["page"]}>
      <Card>
        <CaseSummaryPanel caseData={caseData} />
      </Card>

      {caseData.credentialTokenId > 0 ? (
        <Card>
          <h2>Identidad verificada</h2>
          <DigitalIdentityCredentialCard tokenId={caseData.credentialTokenId} accessMode="police" />
        </Card>
      ) : null}

      <div className={styles["splitGrid"]}>
        <Card>
          <h2>Evidencia permitida</h2>
          <p className={styles["privacyNote"]}>
            Este sistema no comparte documentos ni datos personales reales: la unica evidencia
            disponible es el compromiso criptografico (hash) de la referencia documental que
            presento el ciudadano. No hay forma de ver el contenido original desde este portal.
          </p>
          <p>
            Compromiso documental: <code>{caseData.documentCommitment}</code>
          </p>
        </Card>

        <Card>
          <h2>Verificaciones previas</h2>

          <div className={styles["actionBlock"]}>
            <h3>Validacion de antecedentes</h3>
            {backgroundCheckDone ? (
              <Badge tone="success">Sin antecedentes</Badge>
            ) : (
              <Button
                variant="secondary"
                onClick={() => {
                  setBackgroundCheckDone(true);
                }}
              >
                Ejecutar validacion
              </Button>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <h2>Acciones</h2>
        {!canAct ? (
          <p className={styles["hint"]}>
            Este expediente no esta en revision ({CASE_STATUS_LABEL[caseData.status]}): las acciones
            de Policia no aplican en este estado.
          </p>
        ) : null}

        <div className={styles["actionGrid"]}>
          <div className={styles["actionBlock"]}>
            <h3>Solicitar subsanacion</h3>
            <ReasonCodeField codes={REMEDIATION_REASON_CODES} onChange={setRemediationReason} />
            <Button
              variant="secondary"
              disabled={
                !canAct ||
                IN_FLIGHT_PHASES.has(remediationAction.phase) ||
                !remediationReason.trim()
              }
              onClick={() => {
                void remediationAction.execute();
              }}
            >
              Solicitar subsanacion
            </Button>
            <TransactionProgress
              phase={remediationAction.phase}
              transactionHash={remediationAction.transactionHash}
              blockNumber={remediationAction.blockNumber}
              errorCode={remediationAction.errorCode}
              errorMessage={remediationAction.errorMessage}
              submitError={remediationAction.submitError}
              isTimedOut={remediationAction.isTimedOut}
              onRetryReconciliation={remediationAction.retryReconciliation}
            />
          </div>

          <div className={styles["actionBlock"]}>
            <h3>Aprobacion policial</h3>
            {!canApproveOnChain && canAct ? (
              <p className={styles["hint"]}>Ya aprobado por Policia.</p>
            ) : null}
            {canApproveOnChain && !canApprove ? (
              <p className={styles["hint"]}>Completa la validacion antes de aprobar.</p>
            ) : null}
            <Button
              disabled={!canApprove || IN_FLIGHT_PHASES.has(approveAction.phase)}
              onClick={() => {
                void approveAction.execute();
              }}
            >
              Aprobar
            </Button>
            <TransactionProgress
              phase={approveAction.phase}
              transactionHash={approveAction.transactionHash}
              blockNumber={approveAction.blockNumber}
              errorCode={approveAction.errorCode}
              errorMessage={approveAction.errorMessage}
              submitError={approveAction.submitError}
              isTimedOut={approveAction.isTimedOut}
              onRetryReconciliation={approveAction.retryReconciliation}
            />
          </div>

          <div className={styles["actionBlock"]}>
            <h3>Rechazar</h3>
            <ReasonCodeField codes={REJECTION_REASON_CODES} onChange={setRejectReason} />
            <Button
              variant="danger"
              disabled={!canAct || IN_FLIGHT_PHASES.has(rejectAction.phase) || !rejectReason.trim()}
              onClick={() => {
                void rejectAction.execute();
              }}
            >
              Rechazar expediente
            </Button>
            <TransactionProgress
              phase={rejectAction.phase}
              transactionHash={rejectAction.transactionHash}
              blockNumber={rejectAction.blockNumber}
              errorCode={rejectAction.errorCode}
              errorMessage={rejectAction.errorMessage}
              submitError={rejectAction.submitError}
              isTimedOut={rejectAction.isTimedOut}
              onRetryReconciliation={rejectAction.retryReconciliation}
            />
          </div>
        </div>
      </Card>

      <Card>
        {timelineQuery.isPending ? <p>Consultando timeline...</p> : null}
        {timelineQuery.data ? <CaseTimeline events={timelineQuery.data} /> : null}
      </Card>
    </div>
  );
}
