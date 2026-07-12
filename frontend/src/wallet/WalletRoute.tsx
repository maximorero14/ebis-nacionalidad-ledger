import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAccount } from "wagmi";
import { useAuth } from "../auth/useAuth";
import type { WalletCapabilities } from "../auth/schemas";
import { useRequiredNetwork } from "./useRequiredNetwork";
import { useWalletCapabilities } from "./useWalletCapabilities";

type CapabilityName = keyof WalletCapabilities;

interface WalletRouteProps {
  requires?: CapabilityName[];
}

export function WalletRoute({ requires = [] }: WalletRouteProps) {
  const location = useLocation();
  const { isConnected } = useAccount();
  const { isAuthenticated } = useAuth();
  const { isRequiredNetwork } = useRequiredNetwork();
  const { capabilities, isLoading } = useWalletCapabilities();

  if (!isConnected) {
    return <Navigate to="/wallet" replace state={{ from: location }} />;
  }

  if (!isRequiredNetwork) {
    return <Navigate to="/wallet" replace state={{ from: location }} />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/wallet" replace state={{ from: location }} />;
  }

  if (isLoading) {
    return null;
  }

  if (requires.length > 0 && !requires.some((capability) => capabilities[capability])) {
    return <Navigate to="/prohibido" replace />;
  }

  return <Outlet />;
}
