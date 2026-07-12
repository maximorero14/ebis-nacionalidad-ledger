import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "../../design-system/components/Card";
import { Badge } from "../../design-system/components/Badge";
import { Button } from "../../design-system/components/Button";
import { TransactionProgress } from "../../features/transactions/TransactionProgress";
import { useTransactionAction } from "../../features/transactions/useTransactionAction";
import { ReasonCodeField } from "../../features/cases/ReasonCodeField";
import { REJECTION_REASON_CODES, REMEDIATION_REASON_CODES } from "../../features/cases/reasonCodes";
import { isApiError } from "../../api/errors";
import {
  approvePolice,
  getCase,
  getCaseTimeline,
  rejectCase,
  requestRemediation
} from "../../features/cases/api";
import {
  CASE_STATUS_LABEL,
  CASE_STATUS_TONE,
  describeCaseEvent
} from "../../features/cases/caseLabels";
import { canActOnReview, canPoliceApprove } from "../../features/cases/caseTransitions";
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

  // Both steps below are demo-only UI gates, not chain state: NationalityCaseRegistry.sol
  // has no background-check or age-commitment field (AgeProofVerifier is deferred to M9,
  // see ADR-006/docs/CONTRATOS.md). They exist to reflect the functional precondition
  // documented in docs/FUNCIONAL.md ("compromiso de edad si aplica") without pretending a
  // real check happened; resetting the page loses them on purpose.
  const [backgroundCheckDone, setBackgroundCheckDone] = useState(false);
  const [ageCommitmentRegistered, setAgeCommitmentRegistered] = useState(false);

  const [remediationReason, setRemediationReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  function refreshCase() {
    void queryClient.invalidateQueries({ queryKey: ["case", caseId] });
    void queryClient.invalidateQueries({ queryKey: ["case-timeline", caseId] });
    void queryClient.invalidateQueries({ queryKey: ["case-list"] });
  }

  const remediationAction = useTransactionAction(
    `case-${caseId}-remediation`,
    (idempotencyKey) => requestRemediation(caseId, remediationReason, idempotencyKey),
    () => refreshCase()
  );

  const approveAction = useTransactionAction(
    `case-${caseId}-police-approval`,
    (idempotencyKey) => approvePolice(caseId, idempotencyKey),
    () => refreshCase()
  );

  const rejectAction = useTransactionAction(
    `case-${caseId}-reject`,
    (idempotencyKey) => rejectCase(caseId, rejectReason, idempotencyKey),
    () => refreshCase()
  );

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
  const canApprove = canApproveOnChain && backgroundCheckDone && ageCommitmentRegistered;

  return (
    <div className={styles["page"]}>
      <Card>
        <h1>Expediente #{caseData.caseId}</h1>
        <Badge tone={CASE_STATUS_TONE[caseData.status]}>{CASE_STATUS_LABEL[caseData.status]}</Badge>
        <p>Ronda de revision: {caseData.reviewRound}</p>
        <p>Tasa pagada: {caseData.feePaid ? "si" : "no"}</p>
        <p>Aprobacion Extranjeria: {caseData.foreignAffairsApproved ? "si" : "no"}</p>
        <p>Aprobacion Policia: {caseData.policeApproved ? "si" : "no"}</p>
      </Card>

      <Card>
        <h2>Evidencia permitida</h2>
        <p className={styles["privacyNote"]}>
          Este sistema no comparte documentos ni datos personales reales: la unica evidencia
          disponible es el compromiso criptografico (hash) de la referencia documental que presento
          el ciudadano. No hay forma de ver el contenido original desde este portal.
        </p>
        <p>
          Compromiso documental: <code>{caseData.documentCommitment}</code>
        </p>
      </Card>

      <Card>
        <h2>Verificaciones previas a la aprobacion</h2>
        <p className={styles["privacyNote"]}>
          La fecha de nacimiento nunca se publica on-chain, en eventos, en la API ni en esta
          interfaz. La prueba criptografica completa de mayoria de edad (ZK o atestacion EIP-712)
          esta diferida a M9 (ver ADR-006); estos dos pasos son simulados para reflejar la
          precondicion funcional sin inventar un mecanismo de verificacion real.
        </p>

        <div className={styles["actionBlock"]}>
          <h3>Validacion de antecedentes (simulada)</h3>
          {backgroundCheckDone ? (
            <Badge tone="success">Sin antecedentes (simulado)</Badge>
          ) : (
            <Button
              variant="secondary"
              onClick={() => {
                setBackgroundCheckDone(true);
              }}
            >
              Ejecutar validacion de antecedentes (simulada)
            </Button>
          )}
        </div>

        <div className={styles["actionBlock"]}>
          <h3>Compromiso de mayoria de edad</h3>
          {ageCommitmentRegistered ? (
            <Badge tone="success">Compromiso registrado (simulado)</Badge>
          ) : (
            <Button
              variant="secondary"
              onClick={() => {
                setAgeCommitmentRegistered(true);
              }}
            >
              Registrar compromiso de edad (simulado)
            </Button>
          )}
        </div>
      </Card>

      <Card>
        <h2>Acciones</h2>
        {!canAct ? (
          <p className={styles["hint"]}>
            Este expediente no esta en revision ({CASE_STATUS_LABEL[caseData.status]}): las acciones
            de Policia no aplican en este estado.
          </p>
        ) : null}

        <div className={styles["actionBlock"]}>
          <h3>Solicitar subsanacion</h3>
          <ReasonCodeField codes={REMEDIATION_REASON_CODES} onChange={setRemediationReason} />
          <Button
            variant="secondary"
            disabled={
              !canAct || IN_FLIGHT_PHASES.has(remediationAction.phase) || !remediationReason.trim()
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
            <p className={styles["hint"]}>
              Completa la validacion de antecedentes y el registro del compromiso de edad antes de
              aprobar.
            </p>
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
      </Card>

      <Card>
        <h2>Timeline auditable</h2>
        {timelineQuery.isPending ? <p>Consultando timeline...</p> : null}
        {timelineQuery.data ? (
          <ol className={styles["timeline"]}>
            {timelineQuery.data.map((event) => (
              <li key={`${event.transactionHash}-${event.eventName}`}>
                <span>{describeCaseEvent(event)}</span>
                <span className={styles["timelineMeta"]}>
                  bloque {event.blockNumber} · <code>{event.transactionHash}</code>
                </span>
              </li>
            ))}
          </ol>
        ) : null}
      </Card>
    </div>
  );
}
