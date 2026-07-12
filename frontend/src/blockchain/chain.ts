import { defineChain } from "viem";

export const ebisBesuLocal = defineChain({
  id: Number(import.meta.env["VITE_BESU_CHAIN_ID"] ?? 20260711),
  name: "ebis-besu-local",
  nativeCurrency: {
    name: "Besu Ether",
    symbol: "BESU",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: [import.meta.env["VITE_BESU_RPC_URL"] ?? "http://127.0.0.1:8545"]
    }
  }
});
