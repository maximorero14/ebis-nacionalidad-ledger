import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "../../design-system/components/Card";
import { Badge } from "../../design-system/components/Badge";
import { Button } from "../../design-system/components/Button";
import { TextField } from "../../design-system/components/TextField";
import { useCredential } from "../../features/credentials/useCredential";
import { useContracts } from "../../features/contracts/useContracts";
import { isApiError } from "../../api/errors";
import styles from "./VerifierPortalPage.module.css";

/**
 * Public: no login required (mirrors GET /credentials/{id}(/validity) on the backend,
 * both permitAll in SecurityConfig — see docs/FUNCIONAL.md, the Verificador actor has
 * no account). The id lives in the URL query string so a real deployment's QR would
 * just encode this same link; there is no camera/QR-scanning library here, "de demo"
 * per the plan wording.
 */
export function VerifierPortalPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const idFromUrl = searchParams.get("id") ?? "";
  const [inputValue, setInputValue] = useState(idFromUrl);
  const [showTechnicalEvidence, setShowTechnicalEvidence] = useState(false);
  const [copied, setCopied] = useState(false);

  const queriedTokenId = Number(idFromUrl);
  const hasQuery =
    idFromUrl.trim() !== "" && Number.isInteger(queriedTokenId) && queriedTokenId > 0;

  const { credential, validity } = useCredential(hasQuery ? queriedTokenId : undefined);
  const contracts = useContracts();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = Number(inputValue.trim());
    if (Number.isInteger(parsed) && parsed > 0) {
      setSearchParams({ id: String(parsed) });
      setShowTechnicalEvidence(false);
      setCopied(false);
    }
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(
      `${window.location.origin}/verificador?id=${queriedTokenId}`
    );
    setCopied(true);
  }

  const isValid = validity.data?.valid ?? (credential.data ? !credential.data.revoked : undefined);

  return (
    <div className={styles["page"]}>
      <Card>
        <h1>Portal verificador</h1>
        <p className={styles["hint"]}>
          Consulta publica: no hace falta iniciar sesion. En un despliegue real, un QR codificaria
          un enlace como el que genera este formulario; aqui se simula escribiendo el identificador
          de la credencial.
        </p>
        <form
          className={styles["form"]}
          onSubmit={(event) => {
            handleSubmit(event);
          }}
        >
          <TextField
            label="ID de credencial"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            inputMode="numeric"
            placeholder="Ej: 11"
          />
          <Button type="submit">Consultar</Button>
        </form>
      </Card>

      {hasQuery ? (
        <Card>
          {credential.isPending ? <p>Consultando credencial...</p> : null}

          {credential.isError ? (
            isApiError(credential.error) && credential.error.status === 404 ? (
              <Badge tone="neutral">Inexistente</Badge>
            ) : (
              <p role="alert">No se pudo consultar la credencial en este momento.</p>
            )
          ) : null}

          {credential.data ? (
            <>
              {isValid ? (
                <Badge tone="success">Activa</Badge>
              ) : (
                <Badge tone="danger">Revocada</Badge>
              )}

              <div className={styles["section"]}>
                <h2>Verificacion de mayoria de edad</h2>
                <p className={styles["hint"]}>
                  Esta demo todavia no implementa la prueba criptografica de mayoria de edad
                  (diferida a M9, ver ADR-006 y docs/CONTRATOS.md). Cuando este disponible, este
                  panel mostrara unicamente el resultado — cumple o no cumple — nunca la fecha de
                  nacimiento.
                </p>
              </div>

              <div className={styles["section"]}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowTechnicalEvidence((current) => !current);
                  }}
                >
                  {showTechnicalEvidence ? "Ocultar" : "Mostrar"} evidencia tecnica (opcional)
                </Button>
                {showTechnicalEvidence ? (
                  <div className={styles["technical"]}>
                    <p>Token: #{credential.data.tokenId}</p>
                    <p>
                      Contrato de credenciales:{" "}
                      <code>{contracts.data?.credentialAddress ?? "consultando..."}</code>
                    </p>
                    <p>Chain ID: {contracts.data?.chainId ?? "consultando..."}</p>
                    <p>
                      Titular (direccion EVM): <code>{credential.data.holderAddress}</code>
                    </p>
                    {credential.data.revoked && credential.data.revocationReasonCode ? (
                      <p>
                        Codigo de revocacion (hash, no reversible):{" "}
                        <code>{credential.data.revocationReasonCode}</code>
                      </p>
                    ) : null}
                    <p className={styles["hint"]}>
                      El hash de transaccion y bloque de emision no estan disponibles desde este
                      portal publico: consultarlos requeriria exponer el timeline del expediente
                      (`GET /cases/{"{id}"}/timeline`) sin autenticacion, lo que revelaria mas de lo
                      necesario sobre el proceso del titular.
                    </p>
                  </div>
                ) : null}
              </div>

              <div className={styles["section"]}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    void handleCopyLink();
                  }}
                >
                  Copiar enlace de verificacion (equivalente al QR)
                </Button>
                {copied ? <span className={styles["hint"]}> Enlace copiado.</span> : null}
              </div>
            </>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
