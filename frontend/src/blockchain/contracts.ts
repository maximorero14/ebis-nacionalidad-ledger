import type { Abi } from "viem";
import digitalEuroArtifact from "../../../generated/abis/DigitalEuroDemo.json";
import credentialArtifact from "../../../generated/abis/NationalityCredential.json";
import registryArtifact from "../../../generated/abis/NationalityCaseRegistry.json";
import type { ContractsResponse } from "../features/contracts/schemas";

export const contractAbis = {
  token: digitalEuroArtifact.abi as Abi,
  credential: credentialArtifact.abi as Abi,
  registry: registryArtifact.abi as Abi
} as const;

export function runtimeContracts(deployment: ContractsResponse) {
  return {
    chainId: deployment.chainId,
    token: {
      address: deployment.tokenAddress as `0x${string}`,
      abi: contractAbis.token
    },
    credential: {
      address: deployment.credentialAddress as `0x${string}`,
      abi: contractAbis.credential
    },
    registry: {
      address: deployment.registryAddress as `0x${string}`,
      abi: contractAbis.registry
    }
  } as const;
}

export const contracts = {
  chainId: Number(import.meta.env.VITE_BESU_CHAIN_ID ?? 20260711),
  token: {
    address: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    abi: contractAbis.token
  },
  credential: {
    address: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    abi: contractAbis.credential
  },
  registry: {
    address: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    abi: contractAbis.registry
  }
} as const;
