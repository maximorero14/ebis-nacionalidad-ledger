import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "../../design-system/components/Card";
import { Badge } from "../../design-system/components/Badge";
import { Button } from "../../design-system/components/Button";
import { TextField } from "../../design-system/components/TextField";
import { TransactionProgress } from "../../features/transactions/TransactionProgress";
import { useTransactionAction } from "../../features/transactions/useTransactionAction";
import { EuroBalanceWidget } from "../../features/euro-balance/EuroBalanceWidget";
import { CredentialCard } from "../../features/credentials/CredentialCard";
import { isApiError } from "../../api/errors";
import {
  claimFaucet,
  getCase,
  getCaseTimeline,
  payFee,
  resubmitDocuments,
  submitDocuments
} from "../../features/cases/api";
import {
  CASE_STATUS_LABEL,
  CASE_STATUS_TONE,
  describeCaseEvent
} from "../../features/cases/caseLabels";
import styles from "./CaseDetailPage.module.css";

const IN_FLIGHT_PHASES = new Set(["preparing", "submitting", "pending", "confirmed"]);

export function CaseDetailPage() {
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

  const [documentReference, setDocumentReference] = useState("");

  function refreshCase() {
    void queryClient.invalidateQueries({ queryKey: ["case", caseId] });
    void queryClient.invalidateQueries({ queryKey: ["case-timeline", caseId] });
  }

  const documentsAction = useTransactionAction(
    `case-${caseId}-documents`,
    (idempotencyKey) =>
      caseQuery.data?.status === "REMEDIATION_REQUIRED"
        ? resubmitDocuments(caseId, documentReference, idempotencyKey)
        : submitDocuments(caseId, documentReference, idempotencyKey),
    () => {
      setDocumentReference("");
      refreshCase();
    }
  );

  const faucetAction = useTransactionAction(`case-${caseId}-faucet`, (idempotencyKey) =>
    claimFaucet(caseId, idempotencyKey)
  );

  const feeAction = useTransactionAction(
    `case-${caseId}-fee`,
    (idempotencyKey) => payFee(caseId, idempotencyKey),
    () => refreshCase()
  );

  function handleSubmitDocuments(event: FormEvent) {
    event.preventDefault();
    void documentsAction.execute();
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
      isApiError(error) && error.status === 403
        ? "No estas autorizado para ver este expediente."
        : isApiError(error) && error.status === 404
          ? `El expediente #${caseId} no existe.`
          : `No se pudo consultar el expediente #${caseId}.`;
    return (
      <Card>
        <p>{message}</p>
      </Card>
    );
  }

  const caseData = caseQuery.data;
  const canSubmitDocuments =
    caseData.status === "CREATED" || caseData.status === "REMEDIATION_REQUIRED";
  const canPayFee = caseData.status === "DOCUMENTS_SUBMITTED";

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
        <EuroBalanceWidget evmAddress={caseData.ownerAddress} />
      </Card>

      {canSubmitDocuments ? (
        <Card>
          <h2>
            {caseData.status === "REMEDIATION_REQUIRED"
              ? "Responder a subsanacion"
              : "Presentar referencias documentales"}
          </h2>
          <p className={styles["privacyNote"]}>
            Esta demo no sube documentos reales ni datos personales: solo registra una referencia
            ficticia (por ejemplo, un identificador interno) y guarda en la blockchain unicamente el
            hash (compromiso) de esa referencia, nunca su contenido. La referencia nunca debe
            contener datos personales reales.
          </p>
          <form className={styles["form"]} onSubmit={handleSubmitDocuments}>
            <TextField
              label="Referencia documental (ficticia)"
              value={documentReference}
              onChange={(event) => setDocumentReference(event.target.value)}
              placeholder="REF-DEMO-0001"
              required
            />
            <Button
              type="submit"
              disabled={IN_FLIGHT_PHASES.has(documentsAction.phase) || !documentReference.trim()}
            >
              Enviar
            </Button>
          </form>
          <TransactionProgress
            phase={documentsAction.phase}
            transactionHash={documentsAction.transactionHash}
            blockNumber={documentsAction.blockNumber}
            errorCode={documentsAction.errorCode}
            errorMessage={documentsAction.errorMessage}
            submitError={documentsAction.submitError}
            isTimedOut={documentsAction.isTimedOut}
            onRetryReconciliation={documentsAction.retryReconciliation}
          />
        </Card>
      ) : null}

      {canPayFee ? (
        <Card>
          <h2>Fondos y pago de tasa</h2>
          <Button
            variant="secondary"
            onClick={() => {
              void faucetAction.execute();
            }}
            disabled={IN_FLIGHT_PHASES.has(faucetAction.phase)}
          >
            Reclamar Euro Digital demo (faucet)
          </Button>
          <p className={styles["hint"]}>
            El faucet es unico por direccion, no por expediente: si ya lo reclamaste antes (con
            cualquier expediente), un nuevo intento fallara con "FaucetAlreadyClaimed" — es el
            comportamiento esperado, no un error de la aplicacion.
          </p>
          <TransactionProgress
            phase={faucetAction.phase}
            transactionHash={faucetAction.transactionHash}
            blockNumber={faucetAction.blockNumber}
            errorCode={faucetAction.errorCode}
            errorMessage={faucetAction.errorMessage}
            submitError={faucetAction.submitError}
            isTimedOut={faucetAction.isTimedOut}
            onRetryReconciliation={faucetAction.retryReconciliation}
          />

          <Button
            onClick={() => {
              void feeAction.execute();
            }}
            disabled={IN_FLIGHT_PHASES.has(feeAction.phase)}
          >
            Pagar tasa
          </Button>
          <TransactionProgress
            phase={feeAction.phase}
            transactionHash={feeAction.transactionHash}
            blockNumber={feeAction.blockNumber}
            errorCode={feeAction.errorCode}
            errorMessage={feeAction.errorMessage}
            submitError={feeAction.submitError}
            isTimedOut={feeAction.isTimedOut}
            onRetryReconciliation={feeAction.retryReconciliation}
          />
        </Card>
      ) : null}

      {caseData.credentialTokenId > 0 ? (
        <Card>
          <h2>Credencial</h2>
          <CredentialCard tokenId={caseData.credentialTokenId} />
        </Card>
      ) : null}

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
