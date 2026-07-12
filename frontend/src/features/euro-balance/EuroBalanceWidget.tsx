import { useEuroBalance } from "./useEuroBalance";

export function EuroBalanceWidget({ evmAddress }: { evmAddress: string }) {
  const { data, isPending, isError } = useEuroBalance(evmAddress);

  if (isPending) {
    return <p>Consultando saldo de Euro Digital demo...</p>;
  }

  if (isError || data === undefined) {
    return <p>No se pudo leer el saldo on-chain.</p>;
  }

  return (
    <p>
      Saldo Euro Digital demo: <strong>{data.toFixed(2)} EURD</strong>
    </p>
  );
}
