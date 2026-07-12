import { Card } from "../design-system/components/Card";
import { Button } from "../design-system/components/Button";
import { useAuth } from "../auth/useAuth";
import styles from "./StatusPage.module.css";

interface PortalStubPageProps {
  title: string;
  description: string;
}

/** Placeholder landing for a portal whose real screens are built out in M7.2-M7.5. */
export function PortalStubPage({ title, description }: PortalStubPageProps) {
  const { session, logout } = useAuth();

  return (
    <div className={styles["status"]}>
      <Card className={styles["card"]}>
        <span className={styles["code"]}>Portal</span>
        <h1>{title}</h1>
        <p className={styles["copy"]}>{description}</p>
        {session ? (
          <p>
            Sesion activa: <code>{session.address}</code>
          </p>
        ) : null}
        <Button variant="secondary" onClick={logout}>
          Cerrar sesion
        </Button>
      </Card>
    </div>
  );
}
