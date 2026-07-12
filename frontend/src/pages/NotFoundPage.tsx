import { Link } from "react-router-dom";
import { Card } from "../design-system/components/Card";
import styles from "./StatusPage.module.css";

export function NotFoundPage() {
  return (
    <div className={styles["status"]}>
      <Card className={styles["card"]}>
        <span className={styles["code"]}>404</span>
        <h1>Pagina no encontrada</h1>
        <p className={styles["copy"]}>No hay ningun portal publicado en esta direccion.</p>
        <p>
          <Link to="/">Volver al inicio</Link>
        </p>
      </Card>
    </div>
  );
}
