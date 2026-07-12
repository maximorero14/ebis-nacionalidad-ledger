import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { ebisBesuLocal } from "./chain";

export const wagmiConfig = getDefaultConfig({
  appName: "ebis nacionalidad-ledger",
  projectId: import.meta.env["VITE_WALLETCONNECT_PROJECT_ID"] ?? "ebis-local-dev",
  chains: [ebisBesuLocal],
  transports: {
    [ebisBesuLocal.id]: http(ebisBesuLocal.rpcUrls.default.http[0])
  },
  ssr: false
});
