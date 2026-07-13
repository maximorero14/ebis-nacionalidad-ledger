import { useEuroBalance } from "./useEuroBalance";
import styles from "./EuroBalanceWidget.module.css";

interface EuroBalanceWidgetProps {
  evmAddress: string;
  variant?: "chip" | "panel";
}

function formatAmount(value: number) {
  return value.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function EuroBalanceWidget({ evmAddress, variant = "panel" }: EuroBalanceWidgetProps) {
  const { data, isPending, isError } = useEuroBalance(evmAddress);

  if (variant === "chip") {
    return (
      <div className={styles["chip"]} title="Saldo Euro Digital (demo)">
        <span className={styles["chipIcon"]} aria-hidden="true">
          €
        </span>
        {isPending ? (
          <span className={styles["chipMuted"]}>Cargando...</span>
        ) : isError || data === undefined ? (
          <span className={styles["chipError"]}>Sin saldo</span>
        ) : (
          <span className={styles["chipValue"]}>
            {formatAmount(data)} <span className={styles["chipUnit"]}>dEUR</span>
          </span>
        )}
      </div>
    );
  }

  if (isPending) {
    return <p className={styles["pending"]}>Consultando saldo dEUR...</p>;
  }

  if (isError || data === undefined) {
    return <p className={styles["error"]}>No se pudo leer el saldo on-chain.</p>;
  }

  return (
    <div className={styles["panel"]}>
      <span className={styles["panelIcon"]} aria-hidden="true">
        €
      </span>
      <div className={styles["panelText"]}>
        <span className={styles["label"]}>Euro Digital (demo)</span>
        <strong className={styles["value"]}>{formatAmount(data)} dEUR</strong>
      </div>
    </div>
  );
}
