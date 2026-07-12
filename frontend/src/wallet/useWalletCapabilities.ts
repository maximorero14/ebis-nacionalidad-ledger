import { useMemo } from "react";
import { useAccount, useReadContracts } from "wagmi";
import type { WalletCapabilities } from "../auth/schemas";
import { runtimeContracts } from "../blockchain/contracts";
import { useContracts } from "../features/contracts/useContracts";

const emptyCapabilities: WalletCapabilities = {
  isRegistryAdmin: false,
  isTokenAdmin: false,
  isCredentialAdmin: false,
  canReviewForeignAffairs: false,
  canReviewPolice: false,
  canIssueCredential: false,
  canRevokeCredential: false,
  canMintDemoEuro: false,
  canManageFaucet: false,
  canCollectFees: false
};

export function useWalletCapabilities() {
  const { address } = useAccount();
  const deployedContracts = useContracts();
  const contracts =
    deployedContracts.data === undefined ? undefined : runtimeContracts(deployedContracts.data);
  const enabled = address !== undefined && contracts !== undefined;

  const roleConstants = useReadContracts({
    allowFailure: false,
    query: { enabled },
    contracts:
      contracts === undefined
        ? []
        : [
            { ...contracts.registry, functionName: "DEFAULT_ADMIN_ROLE" },
            { ...contracts.token, functionName: "DEFAULT_ADMIN_ROLE" },
            { ...contracts.credential, functionName: "DEFAULT_ADMIN_ROLE" },
            { ...contracts.registry, functionName: "FOREIGN_AFFAIRS_ROLE" },
            { ...contracts.registry, functionName: "POLICE_ROLE" },
            { ...contracts.registry, functionName: "CREDENTIAL_ISSUER_ROLE" },
            { ...contracts.credential, functionName: "REVOKER_ROLE" },
            { ...contracts.token, functionName: "MINTER_ROLE" },
            { ...contracts.token, functionName: "FAUCET_ROLE" },
            { ...contracts.token, functionName: "FEE_COLLECTOR_ROLE" }
          ]
  });

  const roles = roleConstants.data;
  const roleChecks = useReadContracts({
    allowFailure: false,
    query: { enabled: enabled && roles !== undefined },
    contracts:
      roles && address && contracts
        ? [
            { ...contracts.registry, functionName: "hasRole", args: [roles[0], address] },
            { ...contracts.token, functionName: "hasRole", args: [roles[1], address] },
            { ...contracts.credential, functionName: "hasRole", args: [roles[2], address] },
            { ...contracts.registry, functionName: "hasRole", args: [roles[3], address] },
            { ...contracts.registry, functionName: "hasRole", args: [roles[4], address] },
            { ...contracts.registry, functionName: "hasRole", args: [roles[5], address] },
            { ...contracts.credential, functionName: "hasRole", args: [roles[6], address] },
            { ...contracts.token, functionName: "hasRole", args: [roles[7], address] },
            { ...contracts.token, functionName: "hasRole", args: [roles[8], address] },
            { ...contracts.token, functionName: "hasRole", args: [roles[9], address] }
          ]
        : []
  });

  const capabilities = useMemo<WalletCapabilities>(() => {
    const values = roleChecks.data;
    if (!values) {
      return emptyCapabilities;
    }
    return {
      isRegistryAdmin: Boolean(values[0]),
      isTokenAdmin: Boolean(values[1]),
      isCredentialAdmin: Boolean(values[2]),
      canReviewForeignAffairs: Boolean(values[3]),
      canReviewPolice: Boolean(values[4]),
      canIssueCredential: Boolean(values[5]),
      canRevokeCredential: Boolean(values[6]),
      canMintDemoEuro: Boolean(values[1]),
      canManageFaucet: Boolean(values[8]),
      canCollectFees: Boolean(values[9])
    };
  }, [roleChecks.data]);

  return {
    capabilities,
    isLoading: deployedContracts.isLoading || roleConstants.isLoading || roleChecks.isLoading,
    refetch: roleChecks.refetch
  };
}
