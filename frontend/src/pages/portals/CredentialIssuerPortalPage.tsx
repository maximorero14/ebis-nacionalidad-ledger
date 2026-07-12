import { Card } from "../../design-system/components/Card";
import { useAuth } from "../../auth/useAuth";
import { CaseInbox } from "../../features/cases/CaseInbox";
import styles from "./PortalOverview.module.css";

export function CredentialIssuerPortalPage() {
  const { session } = useAuth();

  return (
    <div className={styles["page"]}>
      <Card className={styles["hero"]}>
        <div>
          <p className={styles["eyebrow"]}>Credencial verificable</p>
          <h1 className={styles["title"]}>Portal emisor</h1>
          <p className={styles["copy"]}>
            Emite credenciales para expedientes aprobados y conserva una ruta publica de
            verificacion sin exponer datos personales.
          </p>
        </div>
        {session ? (
          <div className={styles["session"]}>
            <span className={styles["sessionLabel"]}>Sesion activa</span>
            <code>{session.address}</code>
          </div>
        ) : null}
      </Card>
      <Card>
        <h2>Expedientes aprobados</h2>
        <CaseInbox detailBasePath="/emisor/expedientes" initialFilter="APPROVED" />
      </Card>
    </div>
  );
}
