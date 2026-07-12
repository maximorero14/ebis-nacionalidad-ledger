import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { Button } from "../design-system/components/Button";
import { Card } from "../design-system/components/Card";
import { useRequiredNetwork } from "../wallet/useRequiredNetwork";
import styles from "./WalletPage.module.css";

export function WalletPage() {
  const { isAuthenticated, isSigningIn, loginWithWallet } = useAuth();
  const { isConnected, isRequiredNetwork, switchToRequiredNetwork, isSwitchingNetwork } =
    useRequiredNetwork();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className={styles["accessPage"]}>
      <Card className={styles["accessCard"]}>
        <span className={styles["seal"]} aria-hidden="true">
          ES
        </span>
        <div>
          <p className={styles["eyebrow"]}>Acceso con wallet</p>
          <h1 className={styles["title"]}>Nacionalidad Ledger</h1>
        </div>
        <p className={styles["copy"]}>
          Conecta tu wallet y firma la sesion para entrar al portal que corresponde a tus permisos
          on-chain.
        </p>
        <div className={styles["controls"]}>
          <div className={styles["connectWrap"]}>
            <ConnectButton />
          </div>
          {isConnected && !isRequiredNetwork ? (
            <Button
              className={styles["action"]}
              onClick={switchToRequiredNetwork}
              disabled={isSwitchingNetwork}
            >
              Cambiar a Besu local
            </Button>
          ) : null}
          {isConnected && isRequiredNetwork && !isAuthenticated ? (
            <Button className={styles["action"]} onClick={loginWithWallet} disabled={isSigningIn}>
              Firmar sesion
            </Button>
          ) : null}
        </div>
        <div className={styles["ledgerStrip"]} aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </Card>
    </div>
  );
}
