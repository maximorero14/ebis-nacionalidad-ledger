import { Card } from "../../design-system/components/Card";
import { useAuth } from "../../auth/useAuth";
import { CaseInbox } from "../../features/cases/CaseInbox";
import styles from "./PortalOverview.module.css";

export function ForeignAffairsPortalPage() {
  const { session } = useAuth();

  return (
    <div className={styles["page"]}>
      <Card className={styles["hero"]}>
        <div>
          <p className={styles["eyebrow"]}>Revision administrativa</p>
          <h1 className={styles["title"]}>Portal Extranjeria</h1>
          <p className={styles["copy"]}>
            Supervisa expedientes en revision, valida evidencia permitida y registra decisiones
            administrativas con trazabilidad on-chain.
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
        <CaseInbox detailBasePath="/extranjeria/expedientes" />
      </Card>
    </div>
  );
}
