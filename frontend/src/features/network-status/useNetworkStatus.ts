import { useQuery } from "@tanstack/react-query";
import { fetchNetworkStatus } from "./api";

export function useNetworkStatus() {
  return useQuery({
    queryKey: ["network-status"],
    queryFn: fetchNetworkStatus,
    refetchInterval: 10_000
  });
}
