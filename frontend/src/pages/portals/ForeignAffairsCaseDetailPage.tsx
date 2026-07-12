import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "../../design-system/components/Card";
import { Badge } from "../../design-system/components/Badge";
import { Button } from "../../design-system/components/Button";
import { TransactionStatusView } from "../../features/transactions/TransactionStatusView";
import { ReasonCodeField } from "../../features/cases/ReasonCodeField";
import { isApiError } from "../../api/errors";
import {
  approveForeignAffairs,
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
import { canActOnReview, canForeignAffairsApprove } from "../../features/cases/caseTransitions";
import type { TransactionOutcome } from "../../features/transactions/schemas";
import styles from "./ForeignAffairsCaseDetailPage.module.css";

export function ForeignAffairsCaseDetailPage() {
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

  const [remediationReason, setRemediationReason] = useState("");
  const [remediationOutcome, setRemediationOutcome] = useState<TransactionOutcome | null>(null);
  const [remediationError, setRemediationError] = useState<string | null>(null);
  const [remediationBusy, setRemediationBusy] = useState(false);

  const [approveOutcome, setApproveOutcome] = useState<TransactionOutcome | null>(null);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [approveBusy, setApproveBusy] = useState(false);

  const [rejectReason, setRejectReason] = useState("");
  const [rejectOutcome, setRejectOutcome] = useState<TransactionOutcome | null>(null);
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [rejectBusy, setRejectBusy] = useState(false);

  function refreshCase() {
    void queryClient.invalidateQueries({ queryKey: ["case", caseId] });
    void queryClient.invalidateQueries({ queryKey: ["case-timeline", caseId] });
    void queryClient.invalidateQueries({ queryKey: ["case-list"] });
  }

  async function handleRequestRemediation() {
    setRemediationBusy(true);
    setRemediationError(null);
    try {
      const outcome = await requestRemediation(caseId, remediationReason);
      setRemediationOutcome(outcome);
      if (outcome.status === "CONFIRMED") {
        refreshCase();
      }
    } catch (error) {
      setRemediationError(
        error instanceof Error ? error.message : "No se pudo solicitar la subsanacion"
      );
    } finally {
      setRemediationBusy(false);
    }
  }

  async function handleApprove() {
    setApproveBusy(true);
    setApproveError(null);
    try {
      const outcome = await approveForeignAffairs(caseId);
      setApproveOutcome(outcome);
      if (outcome.status === "CONFIRMED") {
        refreshCase();
      }
    } catch (error) {
      setApproveError(error instanceof Error ? error.message : "No se pudo aprobar el expediente");
    } finally {
      setApproveBusy(false);
    }
  }

  async function handleReject() {
    setRejectBusy(true);
    setRejectError(null);
    try {
      const outcome = await rejectCase(caseId, rejectReason);
      setRejectOutcome(outcome);
      if (outcome.status === "CONFIRMED") {
        refreshCase();
      }
    } catch (error) {
      setRejectError(error instanceof Error ? error.message : "No se pudo rechazar el expediente");
    } finally {
      setRejectBusy(false);
    }
  }

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
  const canApprove = canForeignAffairsApprove(caseData);

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
        <h2>Acciones</h2>
        {!canAct ? (
          <p className={styles["hint"]}>
            Este expediente no esta en revision ({CASE_STATUS_LABEL[caseData.status]}): las acciones
            de Extranjeria no aplican en este estado.
          </p>
        ) : null}

        <div className={styles["actionBlock"]}>
          <h3>Solicitar subsanacion</h3>
          <ReasonCodeField onChange={setRemediationReason} />
          <Button
            variant="secondary"
            disabled={!canAct || remediationBusy || !remediationReason.trim()}
            onClick={() => {
              void handleRequestRemediation();
            }}
          >
            {remediationBusy ? "Enviando..." : "Solicitar subsanacion"}
          </Button>
          {remediationError ? <p role="alert">{remediationError}</p> : null}
          {remediationOutcome ? <TransactionStatusView outcome={remediationOutcome} /> : null}
        </div>

        <div className={styles["actionBlock"]}>
          <h3>Aprobacion administrativa</h3>
          {!canApprove && canAct ? (
            <p className={styles["hint"]}>Ya aprobado por Extranjeria.</p>
          ) : null}
          <Button
            disabled={!canApprove || approveBusy}
            onClick={() => {
              void handleApprove();
            }}
          >
            {approveBusy ? "Aprobando..." : "Aprobar"}
          </Button>
          {approveError ? <p role="alert">{approveError}</p> : null}
          {approveOutcome ? <TransactionStatusView outcome={approveOutcome} /> : null}
        </div>

        <div className={styles["actionBlock"]}>
          <h3>Rechazar</h3>
          <ReasonCodeField onChange={setRejectReason} />
          <Button
            variant="danger"
            disabled={!canAct || rejectBusy || !rejectReason.trim()}
            onClick={() => {
              void handleReject();
            }}
          >
            {rejectBusy ? "Rechazando..." : "Rechazar expediente"}
          </Button>
          {rejectError ? <p role="alert">{rejectError}</p> : null}
          {rejectOutcome ? <TransactionStatusView outcome={rejectOutcome} /> : null}
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
