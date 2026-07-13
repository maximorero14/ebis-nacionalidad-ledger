import type { CredentialResponse } from "./schemas";
import { NationalEmblem } from "./NationalEmblem";
import { formatEpoch, statusLabel } from "./identityDemo";
import styles from "./DigitalIdentityCardBack.module.css";

type DigitalIdentityCardBackProps = {
  credential: CredentialResponse;
  isValid: boolean | undefined;
  chainId: number | string | undefined;
  credentialAddress: string | undefined;
};

export function DigitalIdentityCardBack({
  credential,
  isValid,
  chainId,
  credentialAddress
}: DigitalIdentityCardBackProps) {
  const status = statusLabel(credential, isValid);
  const pillTone = status.tone === "neutral" ? "danger" : status.tone;

  return (
    <section
      className={styles["card"]}
      aria-label={`Evidencia tecnica del DNI digital ${credential.tokenId}`}
    >
      <div className={styles["shine"]} aria-hidden="true" />
      <NationalEmblem className={styles["emblemMark"]} />

      <header className={styles["header"]}>
        <div className={styles["headerIdentity"]}>
          <NationalEmblem className={styles["emblem"]} />
          <div>
            <p className={styles["country"]}>Reino de España</p>
            <p className={styles["docType"]}>Documento Nacional de Identidad</p>
            <p className={styles["sideLabel"]}>Parte trasera</p>
            <h2 className={styles["faceTitle"]}>Evidencia tecnica</h2>
          </div>
        </div>
        <div className={styles["status"]}>
          <span className={`${styles["statusBadge"]} ${styles[pillTone]}`}>
            {isValid ? "Vigente" : "No vigente"}
          </span>
        </div>
      </header>

      <div className={styles["body"]}>
        <dl className={styles["evidenceGrid"]}>
          <div>
            <dt>Token</dt>
            <dd>#{credential.tokenId}</dd>
          </div>
          <div>
            <dt>Chain ID</dt>
            <dd>{chainId ?? "Consultando"}</dd>
          </div>
          <div>
            <dt>Contrato de credenciales</dt>
            <dd>
              <code>{credentialAddress ?? "consultando..."}</code>
            </dd>
          </div>
          <div>
            <dt>Titular EVM</dt>
            <dd>
              <code>{credential.holderAddress}</code>
            </dd>
          </div>
          <div>
            <dt>Compromiso de datos</dt>
            <dd>
              <code>{credential.dataCommitment ?? "No informado"}</code>
            </dd>
          </div>
          <div>
            <dt>Versiones</dt>
            <dd>
              Datos v{credential.dataVersion ?? 1} / Esquema v{credential.schemaVersion ?? 1}
            </dd>
          </div>
          {credential.revoked && credential.revocationReasonCode ? (
            <div>
              <dt>Codigo de revocacion</dt>
              <dd>
                <code>{credential.revocationReasonCode}</code>
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      <p className={styles["note"]}>
        Esta vista confirma estado, contrato y compromiso de datos sin abrir informacion personal
        adicional. La cadena guarda pruebas y estados; los datos personales permanecen fuera de la
        blockchain.
      </p>

      <div className={styles["mrz"]} aria-hidden="true">
        IDD&lt;EBIS&lt;&lt;EVIDENCIA&lt;TECNICA&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
        <br />
        {String(credential.tokenId).padStart(6, "0")}&lt;
        {formatEpoch(credential.issuedAtEpochSeconds).replaceAll("/", "")}
        &lt;ESP&lt;&lt;DEMO&lt;&lt;&lt;&lt;&lt;&lt;
      </div>
    </section>
  );
}
