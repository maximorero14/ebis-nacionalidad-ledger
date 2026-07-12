import { decodeEventLog, keccak256, toBytes } from "viem";
import { usePublicClient } from "wagmi";
import { runtimeContracts } from "../../blockchain/contracts";
import { useContractTransaction } from "../../blockchain/useContractTransaction";
import { useContracts } from "../contracts/useContracts";

const SCHEMA_VERSION = 1;
const FIVE_YEARS_SECONDS = 5n * 365n * 24n * 60n * 60n;

function demoCredentialArgs(caseId: number) {
  const expiresAt = BigInt(Math.floor(Date.now() / 1000)) + FIVE_YEARS_SECONDS;
  const dataCommitment = keccak256(toBytes(`frontend-demo-digital-identity:${caseId}`));
  return [BigInt(caseId), expiresAt, dataCommitment, SCHEMA_VERSION] as const;
}

export function useCreateCaseWithWallet(onConfirmed?: (caseId: number | null) => void) {
  const tx = useContractTransaction();
  const deployedContracts = useContracts();

  async function execute() {
    const data = deployedContracts.data ?? (await deployedContracts.refetch()).data;
    if (data === undefined) {
      return;
    }
    const contracts = runtimeContracts(data);
    try {
      const receipt = await tx.execute({
        ...contracts.registry,
        functionName: "createCase"
      });
      const created = receipt.logs
        .map((log) => {
          try {
            return decodeEventLog({
              abi: contracts.registry.abi,
              data: log.data,
              topics: log.topics
            });
          } catch {
            return null;
          }
        })
        .find((event) => event?.eventName === "CaseCreated");
      const caseId = created?.args && "caseId" in created.args ? Number(created.args.caseId) : null;
      onConfirmed?.(caseId);
    } catch {
      // useContractTransaction already exposes the submit error for the UI.
    }
  }

  return {
    phase: tx.phase,
    transactionHash: tx.transactionHash,
    blockNumber: tx.blockNumber === undefined ? undefined : Number(tx.blockNumber),
    errorCode: tx.phase === "reverted" ? "REVERTED" : undefined,
    errorMessage:
      tx.phase === "reverted" ? "La transaccion fue revertida por el contrato." : undefined,
    submitError: tx.submitError,
    isTimedOut: false,
    retryReconciliation: () => {},
    execute
  };
}

export function useSubmitDocumentsWithWallet(
  caseId: number,
  documentReference: string,
  onConfirmed?: () => void
) {
  const tx = useContractTransaction();
  const deployedContracts = useContracts();

  async function execute() {
    const data = deployedContracts.data ?? (await deployedContracts.refetch()).data;
    if (data === undefined) {
      return;
    }
    const contracts = runtimeContracts(data);
    const documentCommitment = keccak256(toBytes(documentReference.trim()));
    try {
      await tx.execute({
        ...contracts.registry,
        functionName: "submitDocuments",
        args: [BigInt(caseId), documentCommitment]
      });
      onConfirmed?.();
    } catch {
      // useContractTransaction already exposes the submit error for the UI.
    }
  }

  return walletActionResult(tx, execute);
}

export function useClaimFaucetWithWallet(onConfirmed?: () => void) {
  const tx = useContractTransaction();
  const deployedContracts = useContracts();

  async function execute() {
    const data = deployedContracts.data ?? (await deployedContracts.refetch()).data;
    if (data === undefined) {
      return;
    }
    const contracts = runtimeContracts(data);
    try {
      await tx.execute({
        ...contracts.token,
        functionName: "claimFaucet"
      });
      onConfirmed?.();
    } catch {
      // useContractTransaction already exposes the submit error for the UI.
    }
  }

  return walletActionResult(tx, execute);
}

export function usePayFeeWithWallet(caseId: number, onConfirmed?: () => void) {
  const tx = useContractTransaction();
  const deployedContracts = useContracts();
  const publicClient = usePublicClient();

  async function execute() {
    if (!publicClient) {
      return;
    }
    const data = deployedContracts.data ?? (await deployedContracts.refetch()).data;
    if (data === undefined) {
      return;
    }
    const contracts = runtimeContracts(data);
    try {
      const feeAmount = await publicClient.readContract({
        ...contracts.registry,
        functionName: "feeAmount"
      } as never);
      await tx.execute({
        ...contracts.token,
        functionName: "approve",
        args: [contracts.registry.address, feeAmount]
      });
      await tx.execute({
        ...contracts.registry,
        functionName: "payFee",
        args: [BigInt(caseId)]
      });
      onConfirmed?.();
    } catch {
      // useContractTransaction already exposes the submit error for the UI.
    }
  }

  return walletActionResult(tx, execute);
}

export function useApproveForeignAffairsWithWallet(
  caseId: number,
  reviewRound: number,
  onConfirmed?: () => void
) {
  return useRegistryWriteWithWallet(
    "approveForeignAffairs",
    [BigInt(caseId), BigInt(reviewRound)],
    onConfirmed
  );
}

export function useApprovePoliceWithWallet(
  caseId: number,
  reviewRound: number,
  onConfirmed?: () => void
) {
  return useRegistryWriteWithWallet(
    "approvePolice",
    [BigInt(caseId), BigInt(reviewRound)],
    onConfirmed
  );
}

export function useRequestRemediationWithWallet(
  caseId: number,
  reasonCode: string,
  onConfirmed?: () => void
) {
  const reasonHash = reasonCode.trim() ? keccak256(toBytes(reasonCode.trim())) : undefined;
  return useRegistryWriteWithWallet(
    "requestRemediation",
    reasonHash ? [BigInt(caseId), reasonHash] : undefined,
    onConfirmed
  );
}

export function useRejectCaseWithWallet(
  caseId: number,
  reasonCode: string,
  onConfirmed?: () => void
) {
  const reasonHash = reasonCode.trim() ? keccak256(toBytes(reasonCode.trim())) : undefined;
  return useRegistryWriteWithWallet(
    "rejectCase",
    reasonHash ? [BigInt(caseId), reasonHash] : undefined,
    onConfirmed
  );
}

export function useIssueCredentialWithWallet(caseId: number, onConfirmed?: () => void) {
  return useRegistryWriteWithWallet("issueCredential", demoCredentialArgs(caseId), onConfirmed);
}

export function useMintDemoEuroWithWallet(
  to: string,
  amountInCents: bigint | null,
  onConfirmed?: () => void
) {
  const tx = useContractTransaction();
  const deployedContracts = useContracts();

  async function execute() {
    const recipient = to.trim();
    if (!recipient || amountInCents === null || amountInCents <= 0n) {
      return;
    }
    const data = deployedContracts.data ?? (await deployedContracts.refetch()).data;
    if (data === undefined) {
      return;
    }
    const contracts = runtimeContracts(data);
    try {
      await tx.execute({
        ...contracts.token,
        functionName: "mint",
        args: [recipient, amountInCents]
      });
      onConfirmed?.();
    } catch {
      // useContractTransaction already exposes the submit error for the UI.
    }
  }

  return walletActionResult(tx, execute);
}

function useRegistryWriteWithWallet(
  functionName: string,
  args: readonly unknown[] | undefined,
  onConfirmed?: () => void
) {
  const tx = useContractTransaction();
  const deployedContracts = useContracts();

  async function execute() {
    if (!args) {
      return;
    }
    const data = deployedContracts.data ?? (await deployedContracts.refetch()).data;
    if (data === undefined) {
      return;
    }
    const contracts = runtimeContracts(data);
    try {
      await tx.execute({
        ...contracts.registry,
        functionName,
        args
      });
      onConfirmed?.();
    } catch {
      // useContractTransaction already exposes the submit error for the UI.
    }
  }

  return walletActionResult(tx, execute);
}

function walletActionResult(
  tx: ReturnType<typeof useContractTransaction>,
  execute: () => Promise<void>
) {
  return {
    phase: tx.phase,
    transactionHash: tx.transactionHash,
    blockNumber: tx.blockNumber === undefined ? undefined : Number(tx.blockNumber),
    errorCode: tx.phase === "reverted" ? "REVERTED" : undefined,
    errorMessage:
      tx.phase === "reverted" ? "La transaccion fue revertida por el contrato." : undefined,
    submitError: tx.submitError,
    isTimedOut: false,
    retryReconciliation: () => {},
    execute
  };
}
