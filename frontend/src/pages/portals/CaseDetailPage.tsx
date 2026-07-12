import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "../../design-system/components/Card";
import { Button } from "../../design-system/components/Button";
import { TextField } from "../../design-system/components/TextField";
import { TransactionProgress } from "../../features/transactions/TransactionProgress";
import { EuroBalanceWidget } from "../../features/euro-balance/EuroBalanceWidget";
import { CredentialCard } from "../../features/credentials/CredentialCard";
import { isApiError } from "../../api/errors";
import { getCase, getCaseTimeline } from "../../features/cases/api";
import {
  usePayFeeWithWallet,
  useSubmitDocumentsWithWallet
} from "../../features/cases/useCaseWalletActions";
import { CaseSummaryPanel } from "./CaseSummaryPanel";
import { CaseTimeline } from "./CaseTimeline";
import styles from "./CaseDetailPage.module.css";

const IN_FLIGHT_PHASES = new Set(["preparing", "submitting", "pending", "confirmed"]);

const FUTURE_STEPS_BY_STATUS = {
  CREATED: [
    "Presentar referencias documentales",
    "Pagar tasa",
    "Revision de Extranjeria",
    "Revision de Policia",
    "Emision de credencial"
  ],
  DOCUMENTS_SUBMITTED: [
    "Pagar tasa",
    "Revision de Extranjeria",
    "Revision de Policia",
    "Emision de credencial"
  ],
  FEE_PAID: [
    "Entrar en revision",
    "Revision de Extranjeria",
    "Revision de Policia",
    "Emision de credencial"
  ],
  IN_REVIEW: ["Revision de Extranjeria", "Revision de Policia", "Emision de credencial"],
  REMEDIATION_REQUIRED: [
    "Responder subsanacion",
    "Revision de Extranjeria",
    "Revision de Policia",
    "Emision de credencial"
  ],
  APPROVED: ["Emision de credencial"],
  REJECTED: [],
  NONE: []
} as const;

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

  const documentsAction = useSubmitDocumentsWithWallet(caseId, documentReference, () => {
    setDocumentReference("");
    refreshCase();
  });

  const feeAction = usePayFeeWithWallet(caseId, () => refreshCase());

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
  const futureSteps =
    caseData.credentialTokenId > 0 ? [] : [...FUTURE_STEPS_BY_STATUS[caseData.status]];

  return (
    <div className={styles["page"]}>
      <Card>
        <CaseSummaryPanel caseData={caseData} />
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

      <div className={canPayFee ? styles["splitGrid"] : styles["singleGrid"]}>
        <Card>
          <EuroBalanceWidget evmAddress={caseData.ownerAddress} />
        </Card>

        {canPayFee ? (
          <Card>
            <h2>Pago de tasa</h2>
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
      </div>

      {caseData.credentialTokenId > 0 ? (
        <Card>
          <h2>Credencial</h2>
          <CredentialCard tokenId={caseData.credentialTokenId} />
        </Card>
      ) : null}

      <Card>
        {timelineQuery.isPending ? <p>Consultando timeline...</p> : null}
        {timelineQuery.data ? (
          <CaseTimeline events={timelineQuery.data} futureSteps={futureSteps} />
        ) : null}
      </Card>
    </div>
  );
}
