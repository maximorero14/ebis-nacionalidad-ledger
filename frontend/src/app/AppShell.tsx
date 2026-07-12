import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { Button } from "../design-system/components/Button";
import { useWalletCapabilities } from "../wallet/useWalletCapabilities";
import styles from "./AppShell.module.css";

export function AppShell() {
  const location = useLocation();
  const { session, logout, loginWithWallet, isSigningIn } = useAuth();
  const { capabilities } = useWalletCapabilities();
  const isAccessPage = location.pathname === "/wallet";
  const mainClasses = [styles["main"], isAccessPage ? styles["accessMain"] : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles["shell"]}>
      <header className={styles["header"]}>
        <Link to="/" className={styles["brand"]}>
          <span className={styles["brandMark"]}>ES</span>
          <span className={styles["brandText"]}>
            <span className={styles["brandKicker"]}>EBIS</span>
            <span className={styles["brandName"]}>Nacionalidad Ledger</span>
          </span>
        </Link>
        <nav className={styles["nav"]} aria-label="Navegacion principal">
          <Link to="/verificador">Verificador</Link>
          <Link to="/ciudadano">Ciudadano</Link>
          {capabilities.canReviewForeignAffairs ? <Link to="/extranjeria">Extranjeria</Link> : null}
          {capabilities.canReviewPolice ? <Link to="/policia">Policia</Link> : null}
          {capabilities.canIssueCredential ? <Link to="/emisor">Emisor</Link> : null}
          {capabilities.isTokenAdmin ? <Link to="/admin">Admin</Link> : null}
          <ConnectButton />
          {session ? (
            <Button variant="secondary" onClick={logout}>
              Cerrar sesion API
            </Button>
          ) : (
            <Button variant="secondary" onClick={loginWithWallet} disabled={isSigningIn}>
              Firmar sesion
            </Button>
          )}
        </nav>
      </header>
      <main className={mainClasses}>
        <Outlet />
      </main>
    </div>
  );
}
