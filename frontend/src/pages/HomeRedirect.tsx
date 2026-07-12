import { Navigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { useWalletCapabilities } from "../wallet/useWalletCapabilities";

export function HomeRedirect() {
  const { isConnected } = useAccount();
  const { capabilities, isLoading } = useWalletCapabilities();

  if (!isConnected) {
    return <Navigate to="/wallet" replace />;
  }
  if (isLoading) {
    return null;
  }
  if (capabilities.isTokenAdmin) {
    return <Navigate to="/admin" replace />;
  }
  if (capabilities.canReviewForeignAffairs) {
    return <Navigate to="/extranjeria" replace />;
  }
  if (capabilities.canReviewPolice) {
    return <Navigate to="/policia" replace />;
  }
  if (capabilities.canIssueCredential) {
    return <Navigate to="/emisor" replace />;
  }
  return <Navigate to="/ciudadano" replace />;
}
