import { createPublicClient, defineChain, http, type PublicClient } from "viem";

const RPC_URL = import.meta.env["VITE_BESU_RPC_URL"] ?? "http://127.0.0.1:8545";

/**
 * viem requires a Chain object even for a private/permissioned network; the id is only
 * known once GET /contracts resolves (see useEuroBalance), so this is a factory rather
 * than a module-level singleton.
 */
export function createBesuPublicClient(chainId: number): PublicClient {
  const chain = defineChain({
    id: chainId,
    name: "besuLocal",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [RPC_URL] } }
  });
  return createPublicClient({ chain, transport: http(RPC_URL) });
}
