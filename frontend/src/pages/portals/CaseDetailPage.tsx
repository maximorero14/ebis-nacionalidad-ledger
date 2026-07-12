import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "../../design-system/components/Card";
import { Badge } from "../../design-system/components/Badge";
import { Button } from "../../design-system/components/Button";
import { TextField } from "../../design-system/components/TextField";
import { TransactionStatusView } from "../../features/transactions/TransactionStatusView";
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
import type { SubmitDocumentsResponse } from "../../features/cases/schemas";
import type { TransactionOutcome } from "../../features/transactions/schemas";
import styles from "./CaseDetailPage.module.css";

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
  const [documentsOutcome, setDocumentsOutcome] = useState<SubmitDocumentsResponse | null>(null);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [documentsBusy, setDocumentsBusy] = useState(false);

  const [faucetOutcome, setFaucetOutcome] = useState<TransactionOutcome | null>(null);
  const [faucetError, setFaucetError] = useState<string | null>(null);
  const [faucetBusy, setFaucetBusy] = useState(false);

  const [feeOutcome, setFeeOutcome] = useState<TransactionOutcome | null>(null);
  const [feeError, setFeeError] = useState<string | null>(null);
  const [feeBusy, setFeeBusy] = useState(false);

  function refreshCase() {
    void queryClient.invalidateQueries({ queryKey: ["case", caseId] });
    void queryClient.invalidateQueries({ queryKey: ["case-timeline", caseId] });
  }

  async function handleSubmitDocuments(event: FormEvent) {
    event.preventDefault();
    setDocumentsBusy(true);
    setDocumentsError(null);
    try {
      const isRemediation = caseQuery.data?.status === "REMEDIATION_REQUIRED";
      const outcome = isRemediation
        ? await resubmitDocuments(caseId, documentReference)
        : await submitDocuments(caseId, documentReference);
      setDocumentsOutcome(outcome);
      if (outcome.status === "CONFIRMED") {
        setDocumentReference("");
        refreshCase();
      }
    } catch (error) {
      setDocumentsError(
        error instanceof Error ? error.message : "No se pudo enviar la referencia documental"
      );
    } finally {
      setDocumentsBusy(false);
    }
  }

  async function handleClaimFaucet() {
    setFaucetBusy(true);
    setFaucetError(null);
    try {
      setFaucetOutcome(await claimFaucet(caseId));
    } catch (error) {
      setFaucetError(error instanceof Error ? error.message : "No se pudo reclamar el faucet");
    } finally {
      setFaucetBusy(false);
    }
  }

  async function handlePayFee() {
    setFeeBusy(true);
    setFeeError(null);
    try {
      const outcome = await payFee(caseId);
      setFeeOutcome(outcome);
      if (outcome.status === "CONFIRMED") {
        refreshCase();
      }
    } catch (error) {
      setFeeError(error instanceof Error ? error.message : "No se pudo pagar la tasa");
    } finally {
      setFeeBusy(false);
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
          <form
            className={styles["form"]}
            onSubmit={(event) => {
              void handleSubmitDocuments(event);
            }}
          >
            <TextField
              label="Referencia documental (ficticia)"
              value={documentReference}
              onChange={(event) => setDocumentReference(event.target.value)}
              placeholder="REF-DEMO-0001"
              required
            />
            <Button type="submit" disabled={documentsBusy || !documentReference.trim()}>
              {documentsBusy ? "Enviando..." : "Enviar"}
            </Button>
          </form>
          {documentsError ? <p role="alert">{documentsError}</p> : null}
          {documentsOutcome ? <TransactionStatusView outcome={documentsOutcome} /> : null}
        </Card>
      ) : null}

      {canPayFee ? (
        <Card>
          <h2>Fondos y pago de tasa</h2>
          <Button
            variant="secondary"
            onClick={() => {
              void handleClaimFaucet();
            }}
            disabled={faucetBusy}
          >
            {faucetBusy ? "Reclamando..." : "Reclamar Euro Digital demo (faucet)"}
          </Button>
          <p className={styles["hint"]}>
            El faucet es unico por direccion, no por expediente: si ya lo reclamaste antes (con
            cualquier expediente), un nuevo intento fallara con "FaucetAlreadyClaimed" — es el
            comportamiento esperado, no un error de la aplicacion.
          </p>
          {faucetError ? <p role="alert">{faucetError}</p> : null}
          {faucetOutcome ? <TransactionStatusView outcome={faucetOutcome} /> : null}

          <Button
            onClick={() => {
              void handlePayFee();
            }}
            disabled={feeBusy}
          >
            {feeBusy ? "Pagando..." : "Pagar tasa"}
          </Button>
          {feeError ? <p role="alert">{feeError}</p> : null}
          {feeOutcome ? <TransactionStatusView outcome={feeOutcome} /> : null}
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
