import { Badge } from "../../design-system/components/Badge";
import { useCredential } from "./useCredential";
import styles from "./CredentialCard.module.css";

export function CredentialCard({ tokenId }: { tokenId: number }) {
  const { credential, validity } = useCredential(tokenId);

  if (credential.isPending || validity.isPending) {
    return <p>Consultando credencial...</p>;
  }

  if (credential.isError || !credential.data) {
    return <p>No se pudo consultar la credencial.</p>;
  }

  const isValid = validity.data?.valid ?? !credential.data.revoked;

  return (
    <div className={styles["card"]}>
      <p>
        Credencial <strong>#{credential.data.tokenId}</strong> del expediente #
        {credential.data.caseId}
      </p>
      <p>
        Titular: <code>{credential.data.holderAddress}</code>
      </p>
      {isValid ? (
        <Badge tone="success">Vigente</Badge>
      ) : (
        <Badge tone="danger">
          Revocada
          {credential.data.revocationReasonCode
            ? ` — codigo: ${credential.data.revocationReasonCode}`
            : ""}
        </Badge>
      )}
    </div>
  );
}
