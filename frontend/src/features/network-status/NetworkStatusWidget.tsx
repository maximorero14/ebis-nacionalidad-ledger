import { useNetworkStatus } from "./useNetworkStatus";
import styles from "./NetworkStatusWidget.module.css";

/**
 * First real end-to-end proof of the M7.1 stack: fetch -> Zod validation -> TanStack
 * Query, against GET /network/status (M6.1, public), which itself reads live from Besu.
 */
export function NetworkStatusWidget() {
  const { data, isPending, isError } = useNetworkStatus();

  if (isPending) {
    return (
      <p className={styles["widget"]}>
        <span className={styles["dot"]} aria-hidden="true" />
        Consultando estado de la red...
      </p>
    );
  }

  if (isError || !data) {
    return (
      <p className={styles["widget"]}>
        <span className={`${styles["dot"]} ${styles["dotDown"]}`} aria-hidden="true" />
        Red no disponible
      </p>
    );
  }

  return (
    <p className={styles["widget"]}>
      <span className={styles["dot"]} aria-hidden="true" />
      Red activa · bloque {data.blockNumber} · {data.peerCount} pares
    </p>
  );
}
