import { useCallback } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { ebisBesuLocal } from "../blockchain/chain";

export function useRequiredNetwork() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync, isPending } = useSwitchChain();
  const isRequiredNetwork = chainId === ebisBesuLocal.id;

  const switchToRequiredNetwork = useCallback(async () => {
    await switchChainAsync({ chainId: ebisBesuLocal.id });
  }, [switchChainAsync]);

  return {
    requiredChain: ebisBesuLocal,
    chainId,
    isConnected,
    isRequiredNetwork,
    isSwitchingNetwork: isPending,
    switchToRequiredNetwork
  };
}
