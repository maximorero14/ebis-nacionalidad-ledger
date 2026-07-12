import { useState } from "react";
import type { Abi, Hash } from "viem";
import { usePublicClient, useWriteContract } from "wagmi";

export type WalletTransactionPhase =
  | "idle"
  | "preparing"
  | "submitting"
  | "pending"
  | "confirmed"
  | "reverted";

interface ContractWriteRequest {
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
}

export function useContractTransaction() {
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [phase, setPhase] = useState<WalletTransactionPhase>("idle");
  const [transactionHash, setTransactionHash] = useState<Hash | undefined>();
  const [blockNumber, setBlockNumber] = useState<bigint | undefined>();
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function execute(request: ContractWriteRequest) {
    if (!publicClient) {
      throw new Error("No hay cliente RPC disponible para la red conectada.");
    }
    setSubmitError(null);
    setBlockNumber(undefined);
    setTransactionHash(undefined);
    setPhase("preparing");
    try {
      setPhase("submitting");
      const hash = await writeContractAsync({
        address: request.address,
        abi: request.abi,
        functionName: request.functionName,
        args: request.args
      } as never);
      setTransactionHash(hash);
      setPhase("pending");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      setBlockNumber(receipt.blockNumber);
      setPhase(receipt.status === "success" ? "confirmed" : "reverted");
      return receipt;
    } catch (error) {
      setPhase("idle");
      setSubmitError(error instanceof Error ? error.message : "No se pudo completar la transaccion.");
      throw error;
    }
  }

  return { phase, transactionHash, blockNumber, submitError, execute };
}
