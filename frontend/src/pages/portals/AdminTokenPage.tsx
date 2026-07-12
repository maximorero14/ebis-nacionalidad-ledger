import { useMemo, useState, type FormEvent } from "react";
import { getAddress } from "viem";
import { Card } from "../../design-system/components/Card";
import { Button } from "../../design-system/components/Button";
import { TextField } from "../../design-system/components/TextField";
import { TransactionProgress } from "../../features/transactions/TransactionProgress";
import { useMintDemoEuroWithWallet } from "../../features/cases/useCaseWalletActions";
import styles from "./AdminTokenPage.module.css";

const IN_FLIGHT_PHASES = new Set(["preparing", "submitting", "pending", "confirmed"]);

function parseAmountToCents(value: string): bigint | null {
  const trimmed = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return null;
  }
  const [whole, decimals = ""] = trimmed.split(".");
  return BigInt(whole) * 100n + BigInt(decimals.padEnd(2, "0"));
}

export function AdminTokenPage() {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const normalizedRecipient = useMemo(() => {
    try {
      return recipient.trim() ? getAddress(recipient.trim()) : "";
    } catch {
      return "";
    }
  }, [recipient]);
  const amountInCents = useMemo(() => parseAmountToCents(amount), [amount]);
  const mintAction = useMintDemoEuroWithWallet(normalizedRecipient, amountInCents, () => {
    setSubmitted(false);
  });

  const recipientError = submitted && !normalizedRecipient ? "Direccion EVM invalida." : undefined;
  const amountError =
    submitted && (amountInCents === null || amountInCents <= 0n)
      ? "Ingresa una cantidad mayor a 0 con hasta 2 decimales."
      : undefined;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!normalizedRecipient || amountInCents === null || amountInCents <= 0n) {
      return;
    }
    void mintAction.execute();
  }

  return (
    <div className={styles["page"]}>
      <Card className={styles["hero"]}>
        <p className={styles["eyebrow"]}>Tesoreria demo</p>
        <h1>Admin dEUR</h1>
        <p className={styles["hint"]}>
          Solo la wallet con DEFAULT_ADMIN_ROLE del contrato dEUR puede mintear. La autorizacion
          definitiva la aplica el smart contract.
        </p>
      </Card>

      <Card>
        <h2>Mintear Euro Digital demo</h2>
        <form className={styles["form"]} onSubmit={handleSubmit}>
          <TextField
            label="Wallet destino"
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            placeholder="0x..."
            errorMessage={recipientError}
            required
          />
          <TextField
            label="Cantidad dEUR"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="100.00"
            inputMode="decimal"
            errorMessage={amountError}
            required
          />
          <Button type="submit" disabled={IN_FLIGHT_PHASES.has(mintAction.phase)}>
            Mintear
          </Button>
        </form>
        <TransactionProgress
          phase={mintAction.phase}
          transactionHash={mintAction.transactionHash}
          blockNumber={mintAction.blockNumber}
          errorCode={mintAction.errorCode}
          errorMessage={mintAction.errorMessage}
          submitError={mintAction.submitError}
          isTimedOut={mintAction.isTimedOut}
          onRetryReconciliation={mintAction.retryReconciliation}
        />
      </Card>
    </div>
  );
}
