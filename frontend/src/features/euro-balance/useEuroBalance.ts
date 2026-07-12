import { useQuery } from "@tanstack/react-query";
import { useContracts } from "../contracts/useContracts";
import { createBesuPublicClient } from "../../blockchain/publicClient";
import { erc20BalanceAbi } from "./erc20Abi";

/**
 * Reads the Euro Digital demo balance directly from Besu via viem, not the backend: there
 * is no REST endpoint for ERC-20 balances (confirmed while building M7.2 — see
 * docs/evidencias/M7_FRONTEND.md). This is a deliberate blockchain-first read, consistent
 * with keeping backend surface minimal and pushing verifiable reads to the chain.
 */
export function useEuroBalance(evmAddress: string | undefined) {
  const contracts = useContracts();
  const tokenAddress = contracts.data?.tokenAddress;
  const chainId = contracts.data?.chainId;

  return useQuery({
    queryKey: ["euro-balance", tokenAddress, evmAddress],
    queryFn: async () => {
      const client = createBesuPublicClient(chainId as number);
      const address = tokenAddress as `0x${string}`;
      const account = evmAddress as `0x${string}`;
      const [balance, decimals] = await Promise.all([
        client.readContract({
          address,
          abi: erc20BalanceAbi,
          functionName: "balanceOf",
          args: [account]
        }),
        client.readContract({ address, abi: erc20BalanceAbi, functionName: "decimals" })
      ]);
      return Number(balance) / 10 ** decimals;
    },
    enabled: Boolean(tokenAddress) && Boolean(chainId) && Boolean(evmAddress),
    refetchInterval: 10_000
  });
}
