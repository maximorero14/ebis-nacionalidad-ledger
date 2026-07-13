import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { Card } from "../../design-system/components/Card";
import { Badge } from "../../design-system/components/Badge";
import { Button } from "../../design-system/components/Button";
import { TextField } from "../../design-system/components/TextField";
import { useCredential } from "../../features/credentials/useCredential";
import { DigitalIdentityCard } from "../../features/credentials/DigitalIdentityCard";
import { DigitalIdentityCardBack } from "../../features/credentials/DigitalIdentityCardBack";
import { useContracts } from "../../features/contracts/useContracts";
import { isApiError } from "../../api/errors";
import styles from "./VerifierPortalPage.module.css";

/**
 * Public: no login required (mirrors GET /credentials/{id}(/validity) on the backend,
 * both permitAll in SecurityConfig — see docs/FUNCIONAL.md, the Verificador actor has
 * no account). The credential id can also live in the URL query string so the page is
 * refreshable, but verification itself is always entered as an explicit credential lookup.
 */
export function VerifierPortalPage() {
  const { session } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const idFromUrl = searchParams.get("id") ?? "";
  const [inputValue, setInputValue] = useState(idFromUrl);

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
    }
  }

  const isValid = validity.data?.valid ?? (credential.data ? !credential.data.revoked : undefined);
  const viewerOwnsCredential =
    credential.data !== undefined &&
    session?.address.toLowerCase() === credential.data.holderAddress.toLowerCase();
  const accessMode = viewerOwnsCredential
    ? "citizen"
    : session?.capabilities.canReviewPolice
      ? "police"
      : "public";
  const roleLabels = walletRoleLabels(session);

  return (
    <div className={styles["page"]}>
      <Card className={styles["hero"]}>
        <div className={styles["walletRoles"]} aria-label="Roles de la wallet">
          <span>{session ? "Wallet conectada" : "Sin wallet conectada"}</span>
          <div>
            {roleLabels.map((role) => (
              <span key={role} className={styles["roleChip"]}>
                {role}
              </span>
            ))}
          </div>
        </div>

        <div className={styles["heroContent"]}>
          <div>
            <p className={styles["eyebrow"]}>Consulta publica</p>
            <h1>Portal verificador</h1>
          </div>
          <p className={styles["hint"]}>
            Introduce el identificador de la credencial para revelar el DNI digital y su evidencia
            tecnica asociada.
          </p>
        </div>

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
          <Button type="submit">Consultar DNI</Button>
        </form>
      </Card>

      {hasQuery ? (
        <Card key={idFromUrl} className={styles["resultCard"]}>
          {credential.isPending ? <p>Consultando credencial...</p> : null}

          {credential.isError ? (
            isApiError(credential.error) && credential.error.status === 404 ? (
              <Badge tone="neutral">Inexistente</Badge>
            ) : (
              <p role="alert">No se pudo consultar la credencial en este momento.</p>
            )
          ) : null}

          {credential.data ? (
            <div className={styles["cardFaces"]}>
              <DigitalIdentityCard
                credential={credential.data}
                isValid={isValid}
                accessMode={accessMode}
              />
              <DigitalIdentityCardBack
                credential={credential.data}
                isValid={isValid}
                chainId={contracts.data?.chainId}
                credentialAddress={contracts.data?.credentialAddress}
              />
            </div>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}

function walletRoleLabels(session: ReturnType<typeof useAuth>["session"]): string[] {
  if (!session) {
    return ["Verificador publico"];
  }

  const roles: string[] = ["Ciudadano"];
  const capabilities = session.capabilities;

  if (capabilities.canReviewPolice) {
    roles.push("Policia");
  }
  if (capabilities.canReviewForeignAffairs) {
    roles.push("Extranjeria");
  }
  if (capabilities.canIssueCredential) {
    roles.push("Emisor");
  }
  if (capabilities.canRevokeCredential) {
    roles.push("Revocador");
  }
  if (capabilities.isRegistryAdmin || capabilities.isTokenAdmin || capabilities.isCredentialAdmin) {
    roles.push("Admin");
  }
  if (capabilities.canMintDemoEuro) {
    roles.push("Faucet EURD");
  }

  return roles;
}
