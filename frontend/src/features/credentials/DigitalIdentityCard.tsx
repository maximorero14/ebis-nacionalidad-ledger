import { useCredential } from "./useCredential";
import type { CredentialResponse } from "./schemas";
import styles from "./DigitalIdentityCard.module.css";

type AccessMode = "public" | "citizen" | "police";

type DigitalIdentityCardProps = {
  credential: CredentialResponse;
  isValid: boolean | undefined;
  accessMode: AccessMode;
};

type DigitalIdentityCredentialCardProps = {
  tokenId: number;
  accessMode: AccessMode;
};

const FIRST_NAMES = ["Lucia", "Mateo", "Sofia", "Leo", "Valentina", "Nicolas", "Camila"];
const LAST_NAMES = ["Garcia Vidal", "Moreno Ruiz", "Santos Vega", "Navarro Leon", "Iglesias Mora"];
const NATIONALITIES = ["ESP", "ESP", "ESP", "UE-DEMO"];

export function DigitalIdentityCredentialCard({
  tokenId,
  accessMode
}: DigitalIdentityCredentialCardProps) {
  const { credential, validity } = useCredential(tokenId);

  if (credential.isPending || validity.isPending) {
    return <p>Preparando DNI digital...</p>;
  }

  if (credential.isError || !credential.data) {
    return <p>No se pudo consultar el DNI digital.</p>;
  }

  return (
    <DigitalIdentityCard
      credential={credential.data}
      isValid={validity.data?.valid}
      accessMode={accessMode}
    />
  );
}

export function DigitalIdentityCard({ credential, isValid, accessMode }: DigitalIdentityCardProps) {
  const identity = demoIdentity(credential);
  const status = statusLabel(credential, isValid);
  const isCitizen = accessMode === "citizen";
  const isPolice = accessMode === "police";
  const isPublic = accessMode === "public";

  return (
    <section
      className={styles["card"]}
      aria-label={`DNI digital de demostracion ${credential.tokenId}`}
    >
      <div className={styles["shine"]} aria-hidden="true" />
      <div className={styles["watermark"]} aria-hidden="true">
        EBIS
      </div>

      <header className={styles["header"]}>
        <div>
          <p className={styles["sideLabel"]}>Parte frontal</p>
          <p className={styles["country"]}>Reino de España</p>
          <h2>DNI Digital</h2>
        </div>
        <div className={styles["status"]}>
          <span className={`${styles["statusBadge"]} ${styles[status.tone]}`}>{status.label}</span>
        </div>
      </header>

      <div className={styles["body"]}>
        <div className={styles["portraitColumn"]}>
          <div className={styles["portrait"]} aria-hidden="true">
            <span>{identity.initials}</span>
          </div>
          <div className={styles["chip"]} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>

        <dl className={styles["fields"]}>
          <Field label="Nombre" value={identity.fullName} hidden={!isCitizen} />
          <Field label="Documento" value={identity.documentNumber} hidden={!isCitizen} />
          <Field label="Nacimiento" value={identity.dateOfBirth} hidden={!isCitizen} />
          <Field label="Nacionalidad" value={identity.nationality} hidden={isPublic} />
          <Field label="Mayor de edad" value={identity.over18 ? "Si" : "No"} hidden={isPublic} />
          <Field label="Expediente" value={`#${credential.caseId}`} hidden={isPublic} />
          <Field label="Caducidad" value={formatEpoch(credential.expiresAtEpochSeconds)} />
          <Field
            label="Wallet titular"
            value={shortAddress(credential.holderAddress)}
            hidden={!isCitizen}
          />
        </dl>
      </div>

      <footer className={styles["footer"]}>
        <div>
          <span>ID credencial</span>
          <strong>#{credential.tokenId}</strong>
        </div>
        <div>
          <span>Version</span>
          <strong>{credential.dataVersion ?? 1}</strong>
        </div>
        <div>
          <span>Emision</span>
          <strong>{formatEpoch(credential.issuedAtEpochSeconds)}</strong>
        </div>
      </footer>

      <div className={styles["mrz"]} aria-hidden="true">
        IDD&lt;EBIS&lt;&lt;{identity.mrzName}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
        <br />
        {identity.documentNumber.replaceAll("-", "")}&lt;{credential.tokenId}
        &lt;{identity.nationality}&lt;&lt;DEMO&lt;&lt;&lt;&lt;&lt;&lt;
      </div>

      {isPolice ? (
        <p className={styles["privacyNote"]}>
          Vista policial: solo se muestran los atributos autorizados; el resto permanece protegido.
        </p>
      ) : null}
      {isPublic ? (
        <p className={styles["privacyNote"]}>
          Vista publica: confirma vigencia y evidencia tecnica sin revelar datos personales.
        </p>
      ) : null}
    </section>
  );
}

function Field({ label, value, hidden }: { label: string; value: string; hidden?: boolean }) {
  return (
    <div className={hidden ? styles["fieldHidden"] : styles["field"]}>
      <dt>{label}</dt>
      <dd>{hidden ? "Datos protegidos" : value}</dd>
    </div>
  );
}

function demoIdentity(credential: CredentialResponse) {
  const seed = credential.caseId + credential.tokenId;
  const firstName = FIRST_NAMES[seed % FIRST_NAMES.length];
  const lastName = LAST_NAMES[seed % LAST_NAMES.length];
  const birthYear = 1975 + (seed % 28);
  const birthMonth = String((seed % 12) + 1).padStart(2, "0");
  const birthDay = String((seed % 27) + 1).padStart(2, "0");
  const documentNumber = `DNI-${String(credential.tokenId).padStart(6, "0")}-${seed % 9}`;
  const fullName = `${firstName} ${lastName}`;

  return {
    fullName,
    initials: `${firstName[0]}${lastName[0]}`,
    documentNumber,
    dateOfBirth: `${birthDay}/${birthMonth}/${birthYear}`,
    nationality: NATIONALITIES[seed % NATIONALITIES.length],
    over18: true,
    mrzName: `${lastName.replaceAll(" ", "<")}<<${firstName}`.toUpperCase()
  };
}

function statusLabel(credential: CredentialResponse, isValid: boolean | undefined) {
  if (credential.status === "EXPIRED") {
    return { label: "Caducado", tone: "danger" as const };
  }
  if (credential.revoked || credential.status === "REVOKED") {
    return { label: "Revocado", tone: "danger" as const };
  }
  if (isValid ?? credential.status === "ACTIVE") {
    return { label: "Vigente", tone: "success" as const };
  }
  return { label: "No vigente", tone: "neutral" as const };
}

function formatEpoch(epochSeconds: number | undefined) {
  if (!epochSeconds) {
    return "Pendiente";
  }
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(epochSeconds * 1000));
}

function shortAddress(address: string) {
  if (address.length <= 14) {
    return address;
  }
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}
