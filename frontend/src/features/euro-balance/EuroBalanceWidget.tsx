import { useEuroBalance } from "./useEuroBalance";
import styles from "./EuroBalanceWidget.module.css";

export function EuroBalanceWidget({ evmAddress }: { evmAddress: string }) {
  const { data, isPending, isError } = useEuroBalance(evmAddress);

  if (isPending) {
    return <p className={styles["pending"]}>Consultando saldo dEUR...</p>;
  }

  if (isError || data === undefined) {
    return <p className={styles["error"]}>No se pudo leer el saldo on-chain.</p>;
  }

  return (
    <div className={styles["balance"]}>
      <span className={styles["label"]}>Euro Digital demo</span>
      <strong className={styles["value"]}>{data.toFixed(2)} dEUR</strong>
    </div>
  );
}
