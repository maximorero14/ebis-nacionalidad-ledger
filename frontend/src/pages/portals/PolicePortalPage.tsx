import { Card } from "../../design-system/components/Card";
import { useAuth } from "../../auth/useAuth";
import { CaseInbox } from "../../features/cases/CaseInbox";
import styles from "./PortalOverview.module.css";

export function PolicePortalPage() {
  const { session } = useAuth();

  return (
    <div className={styles["page"]}>
      <Card className={styles["hero"]}>
        <div>
          <p className={styles["eyebrow"]}>Revision policial</p>
          <h1 className={styles["title"]}>Portal Policia</h1>
          <p className={styles["copy"]}>
            Bandeja operativa para validar antecedentes, solicitar subsanaciones y cerrar la
            aprobacion policial de expedientes.
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
        <h2>Bandeja de expedientes</h2>
        <CaseInbox detailBasePath="/policia/expedientes" />
      </Card>
    </div>
  );
}
