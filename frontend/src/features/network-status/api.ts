import { apiClient } from "../../api/client";
import { networkStatusSchema, type NetworkStatus } from "./schemas";

export function fetchNetworkStatus(): Promise<NetworkStatus> {
  return apiClient.get("/network/status", networkStatusSchema, { auth: false });
}
