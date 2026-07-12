import { Link } from "react-router-dom";
import { Card } from "../design-system/components/Card";
import styles from "./StatusPage.module.css";

export function ForbiddenPage() {
  return (
    <div className={styles["status"]}>
      <Card className={styles["card"]}>
        <span className={styles["code"]}>403</span>
        <h1>Acceso no autorizado</h1>
        <p className={styles["copy"]}>Tu rol no tiene permiso para ver esta pagina.</p>
        <p>
          <Link to="/">Volver al inicio</Link>
        </p>
      </Card>
    </div>
  );
}
