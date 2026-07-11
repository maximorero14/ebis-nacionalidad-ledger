import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { roleHomePath } from "../auth/roleHome";
import { Button } from "../design-system/components/Button";
import styles from "./AppShell.module.css";

export function AppShell() {
  const { session, logout } = useAuth();

  return (
    <div>
      <header className={styles["header"]}>
        <Link to="/" className={styles["brand"]}>
          ebis · nacionalidad-ledger
        </Link>
        <nav className={styles["nav"]} aria-label="Navegacion principal">
          <Link to="/verificador">Verificador</Link>
          {session ? (
            <>
              <Link to={roleHomePath(session.role)}>Mi panel</Link>
              <Button variant="secondary" onClick={logout}>
                Cerrar sesion
              </Button>
            </>
          ) : (
            <Link to="/login">Ingresar</Link>
          )}
        </nav>
      </header>
      <main className={styles["main"]}>
        <Outlet />
      </main>
    </div>
  );
}
